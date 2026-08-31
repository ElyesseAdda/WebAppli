/** Recadrage et redimensionnement d'un logo client (max 512 px côté client). */
export function createCroppedLogoBlob(imageSrc, pixelCrop, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      let largeur = pixelCrop.width;
      let hauteur = pixelCrop.height;
      if (Math.max(largeur, hauteur) > maxSize) {
        const ratio = maxSize / Math.max(largeur, hauteur);
        largeur = Math.round(largeur * ratio);
        hauteur = Math.round(hauteur * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = largeur;
      canvas.height = hauteur;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        largeur,
        hauteur
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas vide"));
            return;
          }
          resolve(blob);
        },
        "image/png",
        0.92
      );
    };
    image.onerror = reject;
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
  });
}

export async function uploadLogoClientDiagramme(diagrammeId, blob) {
  const formData = new FormData();
  formData.append("logo", blob, "logo.png");
  const { default: axios } = await import("axios");
  const res = await axios.post(
    `/api/gantt/diagrammes/${diagrammeId}/upload_logo_client/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

export async function deleteLogoClientDiagramme(diagrammeId) {
  const { default: axios } = await import("axios");
  const res = await axios.delete(
    `/api/gantt/diagrammes/${diagrammeId}/delete_logo_client/`
  );
  return res.data;
}
