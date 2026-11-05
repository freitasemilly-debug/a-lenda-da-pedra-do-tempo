import logo from "@/assets/time-stone-logo.png";

export function OpeningLogo({ compact = false }: { compact?: boolean }) {
  return <img src={logo} alt="A LENDA DA PEDRA DO TEMPO" width={1536} height={768} className={`opening-logo ${compact ? "opening-logo-compact" : ""}`} />;
}