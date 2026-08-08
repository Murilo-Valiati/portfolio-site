import { promises as fs } from "fs";
import path from "path";

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
  repo: string;
}

export interface Language {
  name: string;
  level: number;
}

export interface Experience {
  id: string;
  role: string;
  place: string;
  period: string;
  description: string;
}

export interface SiteContent {
  profile: {
    name: string;
    title: string;
    bio: string;
    location: string;
    avatarInitials: string;
    avatarUrl: string | null;
  };
  skills: string[];
  experience: Experience[];
  projects: Project[];
  languages: Language[];
  contact: {
    email: string;
    linkedin: string;
    github: string;
    whatsapp: string;
  };
}

export const DEFAULT_CONTENT: SiteContent = {
  profile: {
    name: "Murilo Valiati",
    title: "Desenvolvedor de Software",
    bio: "Apaixonado por tecnologia e por transformar ideias em produtos digitais. Atuo com desenvolvimento web, sempre buscando aprender novas ferramentas e boas práticas para entregar soluções simples e eficientes.",
    location: "Brasil",
    avatarInitials: "MV",
    avatarUrl: null,
  },
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "AWS",
    "Docker",
    "SQL",
  ],
  experience: [
    {
      id: "experiencia-1",
      role: "Cargo/função",
      place: "Empresa ou contexto",
      period: "0000 - Atual",
      description:
        "Descreva aqui suas principais responsabilidades e conquistas nessa posição.",
    },
  ],
  projects: [
    {
      id: "projeto-1",
      title: "Projeto Exemplo 1",
      description:
        "Descreva aqui o problema que o projeto resolve, as tecnologias usadas e seu papel no desenvolvimento.",
      tags: ["Next.js", "TypeScript"],
      link: "#",
      repo: "#",
    },
    {
      id: "projeto-2",
      title: "Projeto Exemplo 2",
      description:
        "Descreva aqui o problema que o projeto resolve, as tecnologias usadas e seu papel no desenvolvimento.",
      tags: ["React", "Node.js"],
      link: "#",
      repo: "#",
    },
    {
      id: "projeto-3",
      title: "Projeto Exemplo 3",
      description:
        "Descreva aqui o problema que o projeto resolve, as tecnologias usadas e seu papel no desenvolvimento.",
      tags: ["AWS", "Docker"],
      link: "#",
      repo: "#",
    },
  ],
  languages: [
    { name: "Português", level: 100 },
    { name: "Inglês", level: 5 },
    { name: "Espanhol", level: 20 },
  ],
  contact: {
    email: "murilo.valiat@gmail.com",
    linkedin: "https://www.linkedin.com/in/SEU-USUARIO",
    github: "https://github.com/Murilo-Valiati",
    whatsapp: "https://wa.me/55SEUNUMERO",
  },
};

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getContent(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(CONTENT_FILE, "utf-8");
    return { ...DEFAULT_CONTENT, ...JSON.parse(raw) };
  } catch {
    await ensureDataDir();
    await fs.writeFile(CONTENT_FILE, JSON.stringify(DEFAULT_CONTENT, null, 2));
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(content: SiteContent): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONTENT_FILE, JSON.stringify(content, null, 2));
}
