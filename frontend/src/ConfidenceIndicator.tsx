import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { MONO_FONT } from "./theme";

interface ConfidenceIndicatorProps {
  confidence: number;
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? "success" : confidence >= 0.5 ? "warning" : "error";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 72 }}>
      <LinearProgress
        aria-label="Confidence"
        variant="determinate"
        value={percent}
        color={color}
        sx={{ width: 48, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ fontFamily: MONO_FONT }}>
        {percent}%
      </Typography>
    </Box>
  );
}
