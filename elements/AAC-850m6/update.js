function(instance, properties, context) {
    // Conversor RGBA -> HEX compatível com qrcode@1.4.4
    const rgba2hex = function(orig) {
        const match = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
        if (!match) return orig; // Se já for HEX
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        // Retorna HEX puro sem alpha
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    if (!properties.url || properties.url.trim() === "") {
        instance.publishState("status", "aguardando_url");
        return;
    }

    instance.publishState("status", "gerando");

    // Acha o canvas
    const canvas = instance.canvas.find(".qr-canvas")[0];
    if (!canvas) return;

    // Define cores e tamanhos
    const darkColor = rgba2hex(properties.dark_color || "rgba(0,0,0,1)");
    const lightColor = rgba2hex(properties.light_color || "rgba(255,255,255,1)");

    const width = instance.canvas.width() || 200;
    const height = instance.canvas.height() || 200;
    const qrSize = Math.min(width, height);

    const options = {
        width: qrSize,
        margin: 1,
        color: {
            dark: darkColor,
            light: lightColor
        },
        errorCorrectionLevel: 'H'
    };

    // Gera QR Code
    QRCode.toCanvas(canvas, properties.url, options, function(error) {
        if (error) {
            console.error("Erro ao gerar QR Code:", error);
            instance.publishState("status", "erro");
            return;
        }

        // Se tiver logo
        if (properties.logo && properties.logo.trim() !== "") {
            const ctx = canvas.getContext("2d");
            const logo = new Image();
            logo.crossOrigin = "anonymous"; // Evita bloqueio CORS
            logo.src = properties.logo;

            logo.onload = function() {
                const logoSize = properties.logo_size ? properties.logo_size : 0.25;
                const logoWidth = canvas.width * logoSize;
                const logoHeight = canvas.height * logoSize;
                const x = (canvas.width - logoWidth) / 2;
                const y = (canvas.height - logoHeight) / 2;
                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
            };

            logo.onerror = () => console.warn("Logo inválido ou não carregado:", properties.logo);
        }

        instance.publishState("status", "concluido");
    });
}
