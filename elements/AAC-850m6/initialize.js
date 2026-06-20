function(instance, context) {
    const container = $('<div class="qrcode-container" style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;overflow:hidden;background:#fff;"></div>');
    const canvas = document.createElement("canvas");
    canvas.className = "qr-canvas";
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    container.append(canvas);
    instance.canvas.append(container);
}
