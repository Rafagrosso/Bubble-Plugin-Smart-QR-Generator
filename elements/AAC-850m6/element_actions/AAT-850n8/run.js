function(instance, properties, context) {
    const canvas = instance.canvas.find(".qr-canvas")[0];
    if (!canvas) return;

    let dataUrl;
    try {
        dataUrl = canvas.toDataURL("image/png");
    } catch (e) {
        console.error("Não foi possível exportar o QR Code:", e);
        return;
    }

    const name = (properties.filename && properties.filename.trim())
        ? properties.filename.trim().replace(/\.png$/i, "")
        : "qrcode";

    const link = document.createElement("a");
    link.download = name + ".png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
