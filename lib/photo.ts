export async function preparePhoto(file: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5242880
  )
    throw Error("Escolha uma foto JPG, PNG ou WebP de até 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(Error("Não foi possível abrir essa foto."));
      image.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("Não foi possível preparar a foto.")),
        "image/webp",
        0.88,
      ),
    );
    return new File([blob], "photo.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
