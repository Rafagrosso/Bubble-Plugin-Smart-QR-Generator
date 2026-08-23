function(instance, properties, context) {
    const canvas = instance.canvas.find(".qr-canvas")[0];
    if (!canvas) return;

    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        console.warn("Este navegador não suporta copiar imagens para a área de transferência.");
        return;
    }

    canvas.toBlob(function(blob) {
        if (!blob) {
            console.error("Não foi possível exportar o QR Code para copiar.");
            return;
        }
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
            .catch(function(e) {
                console.error("Erro ao copiar o QR Code:", e);
            });
    }, "image/png");
}
