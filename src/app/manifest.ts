import type { MetadataRoute } from "next";

/**
 * Instalado na tela de início, o site abre direto no painel Hoje, em tela
 * cheia — o "app" da rotina.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Murilo Valiati",
    short_name: "Hoje",
    description: "Painel do dia: agenda, notas e hábitos.",
    start_url: "/admin/hoje",
    display: "standalone",
    background_color: "#021b1a",
    theme_color: "#021b1a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
