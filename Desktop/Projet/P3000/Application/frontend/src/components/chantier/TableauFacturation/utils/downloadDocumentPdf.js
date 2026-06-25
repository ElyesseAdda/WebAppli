import axios from "axios";

const sanitizeFilename = (name) =>
  String(name || "document")
    .replace(/[<>:"/\\|?*]/g, "-")
    .trim() || "document";

export const downloadDocumentPdf = async ({ url, payload, filename, onStatus }) => {
  try {
    onStatus?.({ message: "Téléchargement en cours...", severity: "info" });

    const response = await axios.post(url, payload, {
      responseType: "blob",
      headers: { "Content-Type": "application/json" },
    });

    const contentType = response.headers["content-type"] || "";

    if (contentType.includes("application/pdf")) {
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      const safeName = sanitizeFilename(filename);
      link.download = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(pdfUrl);
      onStatus?.({ message: "Téléchargement terminé avec succès", severity: "success" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const err = JSON.parse(reader.result);
        onStatus?.({
          message: `Erreur : ${err.error || "Erreur inconnue"}`,
          severity: "error",
        });
      } catch {
        onStatus?.({ message: "Erreur lors du téléchargement", severity: "error" });
      }
    };
    reader.readAsText(response.data);
  } catch {
    onStatus?.({
      message: "Erreur lors du téléchargement. Veuillez réessayer.",
      severity: "error",
    });
  }
};
