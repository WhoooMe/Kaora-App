import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const INITIAL_VERIFICATION = {
  state: "idle",
  message: "Belum ada frame yang diverifikasi.",
  code: null,
  token: null,
  result: null,
};

const WorkflowContext = createContext(null);

export function WorkflowProvider({ children }) {
  const objectUrlRef = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageSource, setImageSource] = useState("uploaded_image");
  const [verification, setVerification] = useState(INITIAL_VERIFICATION);
  const [lastDetection, setLastDetection] = useState(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const revokePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const setFrame = useCallback(
    (file, source = "uploaded_image") => {
      revokePreviewUrl();
      if (!file) {
        setImageFile(null);
        setImagePreviewUrl("");
        setImageSource("uploaded_image");
        setVerification(INITIAL_VERIFICATION);
        setLastDetection(null);
        return;
      }
      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setImageFile(file);
      setImagePreviewUrl(nextUrl);
      setImageSource(source);
      setVerification({
        state: "pending",
        message: "Frame siap dikirim ke backend untuk verifikasi objek kakao.",
        code: null,
        token: null,
        result: null,
      });
      setLastDetection(null);
    },
    [revokePreviewUrl],
  );

  const clearWorkflow = useCallback(() => {
    revokePreviewUrl();
    setImageFile(null);
    setImagePreviewUrl("");
    setImageSource("uploaded_image");
    setVerification(INITIAL_VERIFICATION);
    setLastDetection(null);
  }, [revokePreviewUrl]);

  const markDetectionSuccess = useCallback((result) => {
    setLastDetection(result);
    setHistoryVersion((v) => v + 1);
  }, []);

  const value = {
    imageFile,
    imagePreviewUrl,
    imageSource,
    verification,
    setVerification,
    setFrame,
    clearWorkflow,
    lastDetection,
    markDetectionSuccess,
    selectedDetectionId,
    setSelectedDetectionId,
    historyVersion,
    bumpHistory: () => setHistoryVersion((v) => v + 1),
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return ctx;
}
