function(instance, properties, context) {
    // Conversor RGBA -> HEX compatível com qrcode@1.4.4 (suporta alpha em HEX de 8 dígitos)
    const rgba2hex = function(orig) {
        const match = String(orig).replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
        if (!match) return orig; // Se já for HEX
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        let hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        if (match[4] !== undefined) {
            const a = Math.round(Math.min(Math.max(parseFloat(match[4]), 0), 1) * 255);
            hex += ("0" + a.toString(16)).slice(-2);
        }
        return hex;
    };

    // Acha o canvas
    const canvas = instance.canvas.find(".qr-canvas")[0];
    if (!canvas) return;

    if (!properties.url || properties.url.trim() === "") {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        instance.publishState("status", "aguardando_url");
        instance.publishState("qr_base64", "");
        return;
    }

    instance.publishState("status", "gerando");

    // Define cores e tamanhos
    const darkColor = rgba2hex(properties.dark_color || "rgba(0,0,0,1)");
    // Fundo transparente permite usar o QR sobre qualquer superfície (impressão, imagens etc.)
    const lightColor = properties.transparent_bg
        ? "#ffffff00"
        : rgba2hex(properties.light_color || "rgba(255,255,255,1)");

    const width = instance.canvas.width() || 200;
    const height = instance.canvas.height() || 200;
    const qrSize = Math.min(width, height);

    const margin = (typeof properties.margin === "number" && properties.margin >= 0)
        ? properties.margin
        : 1;

    const validLevels = ["L", "M", "Q", "H"];
    const errorCorrectionLevel = validLevels.indexOf(properties.error_correction) !== -1
        ? properties.error_correction
        : "H";

    const options = {
        width: qrSize,
        margin: margin,
        color: {
            dark: darkColor,
            light: lightColor
        },
        errorCorrectionLevel: errorCorrectionLevel
    };

    // Publica o base64 e sinaliza conclusão (chamado após desenhar tudo)
    const finish = function() {
        try {
            instance.publishState("qr_base64", canvas.toDataURL("image/png"));
        } catch (e) {
            console.warn("Não foi possível exportar o QR Code em base64 (logo de outro domínio sem CORS?):", e);
            instance.publishState("qr_base64", "");
        }
        instance.publishState("status", "concluido");
        instance.triggerEvent("generated");
    };

    // Gera QR Code
    QRCode.toCanvas(canvas, properties.url, options, function(error) {
        if (error) {
            console.error("Erro ao gerar QR Code:", error);
            instance.publishState("status", "erro");
            instance.publishState("qr_base64", "");
            instance.triggerEvent("generation_error");
            return;
        }

        // Se tiver logo
        if (properties.logo && properties.logo.trim() !== "") {
            const ctx = canvas.getContext("2d");
            const logo = new Image();
            logo.crossOrigin = "anonymous"; // Evita bloqueio CORS
            logo.src = properties.logo;

            logo.onload = function() {
                // Limita o tamanho para o QR continuar escaneável
                let logoSize = properties.logo_size ? properties.logo_size : 0.25;
                logoSize = Math.min(Math.max(logoSize, 0.05), 0.5);

                const logoWidth = canvas.width * logoSize;
                const logoHeight = canvas.height * logoSize;
                const x = (canvas.width - logoWidth) / 2;
                const y = (canvas.height - logoHeight) / 2;

                // Fundo branco atrás do logo melhora a leitura do QR
                if (properties.logo_background !== false) {
                    const pad = Math.max(4, logoWidth * 0.08);
                    const bx = x - pad;
                    const by = y - pad;
                    const bw = logoWidth + pad * 2;
                    const bh = logoHeight + pad * 2;
                    const radius = Math.min(8, pad * 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.moveTo(bx + radius, by);
                    ctx.arcTo(bx + bw, by, bx + bw, by + bh, radius);
                    ctx.arcTo(bx + bw, by + bh, bx, by + bh, radius);
                    ctx.arcTo(bx, by + bh, bx, by, radius);
                    ctx.arcTo(bx, by, bx + bw, by, radius);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                finish();
            };

            logo.onerror = function() {
                console.warn("Logo inválido ou não carregado:", properties.logo);
                finish();
            };
        } else {
            finish();
        }
    });
}
