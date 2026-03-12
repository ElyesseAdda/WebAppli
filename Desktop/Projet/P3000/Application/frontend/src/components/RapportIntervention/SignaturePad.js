import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { MdDelete } from "react-icons/md";

const SignaturePad = forwardRef(({ existingSignatureUrl, disabled }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => {
      if (!hasSignature) return null;
      return canvasRef.current?.toDataURL("image/png") || null;
    },
    hasSignature: () => hasSignature,
    clear: () => clearCanvas(),
  }));

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      const pos = getPos(e);
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [disabled, getPos]
  );

  const draw = useCallback(
    (e) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();
      const pos = getPos(e);
      const ctx = canvasRef.current.getContext("2d");
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, disabled, getPos]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Signature
      </Typography>
      {existingSignatureUrl && !hasSignature ? (
        <Box sx={{ mb: 1 }}>
          <img
            src={existingSignatureUrl}
            alt="Signature existante"
            style={{ maxWidth: 300, maxHeight: 150, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </Box>
      ) : null}
      <Box
        sx={{
          border: "2px dashed #ccc",
          borderRadius: 1,
          position: "relative",
          touchAction: "none",
          cursor: disabled ? "not-allowed" : "crosshair",
          opacity: disabled ? 0.5 : 1,
          mb: 1,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: 200, display: "block" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<MdDelete />}
          onClick={clearCanvas}
          disabled={disabled || !hasSignature}
        >
          Effacer
        </Button>
        {hasSignature && (
          <Typography variant="caption" color="success.main" sx={{ alignSelf: "center" }}>
            Signature prete - elle sera enregistree a la sauvegarde
          </Typography>
        )}
      </Box>
    </Box>
  );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
