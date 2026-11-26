import { useCallback, useEffect, useState } from "react";
import { listDetections } from "../api/kaoraApi.js";
import { useWorkflow } from "../context/WorkflowContext.jsx";

const PAGE_SIZE = 100;

export default function useDetectionRecords({ enabled = true } = {}) {
  const { historyVersion: version = 0 } = useWorkflow();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const first = await listDetections({ limit: PAGE_SIZE, offset: 0 });
        const all = Array.isArray(first.items) ? [...first.items] : [];
        const count = Number.isFinite(first.total) ? first.total : all.length;
        for (let offset = PAGE_SIZE; offset < count; offset += PAGE_SIZE) {
          const page = await listDetections({ limit: PAGE_SIZE, offset });
          const items = Array.isArray(page.items) ? page.items : [];
          if (!items.length) break;
          all.push(...items);
        }
        const unique = [...new Map(all.filter((item) => item?.id).map((item) => [item.id, item])).values()];
        if (active) {
          setRecords(unique);
          setTotal(count);
        }
      } catch (err) {
        if (active) setError(err.message || "Data deteksi tidak dapat dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [enabled, revision, version]);

  return { records, total, loading, error, refresh };
}
