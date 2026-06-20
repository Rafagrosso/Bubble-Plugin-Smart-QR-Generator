function(instance, properties) {
    const margin = 6;
    const width = (properties.width || 150) - margin * 2;

    const qr = new Image(width, width);
    qr.style.padding = "4px";
    qr.src = "https://s3.amazonaws.com/appforest_uf/f1627437102891x317756865227791360/qr-code.png"; // Ícone de QR genérico

    instance.canvas.empty();
    instance.canvas.append(qr);
}
