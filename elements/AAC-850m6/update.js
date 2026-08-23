function(instance, properties, context) {
    // Normaliza qualquer cor CSS para HEX, que é o formato aceito pela
    // biblioteca qrcode. O próprio navegador resolve a sintaxe de entrada
    // (nome, #rgb, rgb(), rgba(), hsl()) e devolve sempre rgb()/rgba();
    // aqui só formatamos esse resultado.
    const probe = document.createElement("div");
    const toHex = function(value, fallback) {
        const raw = (value === null || value === undefined) ? "" : String(value).trim();
        if (raw === "") return fallback;

        probe.style.color = "";
        probe.style.color = raw;
        const normalized = probe.style.color;
        if (normalized === "") return fallback; // cor inválida

        const byte = function(n) {
            const v = Math.min(255, Math.max(0, Math.round(Number(n) || 0)));
            return ("0" + v.toString(16)).slice(-2);
        };

        const m = normalized.replace(/\s/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
        if (!m) {
            return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)
                ? normalized.toLowerCase()
                : fallback;
        }

        let hex = "#" + byte(m[1]) + byte(m[2]) + byte(m[3]);
        const alpha = m[4] === undefined ? 1 : Math.min(1, Math.max(0, parseFloat(m[4])));
        if (alpha < 1) hex += byte(alpha * 255);
        return hex;
    };

    const isTransparent = function(hex) {
        return /^#[0-9a-f]{6}00$/i.test(hex);
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

    const darkColor = toHex(properties.dark_color, "#000000");
    // O fundo do QR vem do Background do elemento, definido no painel de estilo
    // do Bubble — um único lugar para escolher a cor, em vez de um campo do
    // plugin que competia com ele. Sem background definido o valor computado é
    // transparente, e o QR sai com fundo transparente.
    const lightColor = toHex(instance.canvas.css("background-color"), "#ffffff00");

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

                // Fundo atrás do logo melhora a leitura do QR. Segue a cor de
                // fundo do código; se ela for transparente, usa branco, que é
                // o que garante contraste com os módulos escuros.
                if (properties.logo_background !== false) {
                    const pad = Math.max(4, logoWidth * 0.08);
                    const bx = x - pad;
                    const by = y - pad;
                    const bw = logoWidth + pad * 2;
                    const bh = logoHeight + pad * 2;
                    const radius = Math.min(8, pad * 2);
                    ctx.fillStyle = isTransparent(lightColor) ? "#ffffff" : lightColor;
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