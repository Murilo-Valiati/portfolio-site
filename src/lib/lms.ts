import { promises as fs } from "fs";
import path from "path";

export interface Lesson {
  id: string;
  title: string;
  content: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  modules: Module[];
}

export const COURSES: Course[] = [
  {
    id: "logica-de-programacao",
    title: "Lógica de Programação",
    category: "Tecnologia",
    description:
      "Fundamentos de algoritmos, variáveis, estruturas de controle e raciocínio lógico para programar.",
    modules: [
      {
        id: "fundamentos",
        title: "Fundamentos",
        lessons: [
          {
            id: "o-que-e-algoritmo",
            title: "O que é um algoritmo",
            content:
              "Um algoritmo é uma sequência finita e bem definida de passos para resolver um problema ou executar uma tarefa. Antes de escrever código, é útil descrever o algoritmo em português (pseudocódigo) para organizar o raciocínio: quais são as entradas, quais passos transformam essas entradas, e qual é a saída esperada.",
          },
          {
            id: "variaveis-e-tipos",
            title: "Variáveis e tipos de dados",
            content:
              "Variáveis são espaços nomeados na memória que guardam valores que podem mudar durante a execução do programa. Tipos comuns incluem números inteiros, números decimais, texto (strings) e valores booleanos (verdadeiro/falso). Escolher o tipo certo evita erros e deixa o código mais claro.",
          },
        ],
      },
      {
        id: "estruturas-de-controle",
        title: "Estruturas de Controle",
        lessons: [
          {
            id: "condicionais",
            title: "Condicionais (se/então)",
            content:
              "Estruturas condicionais permitem que o programa tome decisões: 'se uma condição for verdadeira, faça X; senão, faça Y'. São a base para criar comportamentos diferentes conforme os dados de entrada.",
          },
          {
            id: "loops",
            title: "Repetição (loops)",
            content:
              "Loops permitem repetir um bloco de instruções várias vezes, evitando duplicar código. Os dois tipos mais comuns são o loop com contador definido (for) e o loop condicional (while), que repete enquanto uma condição for verdadeira.",
          },
        ],
      },
    ],
  },
  {
    id: "estruturas-de-dados",
    title: "Estruturas de Dados",
    category: "Tecnologia",
    description:
      "Como organizar e acessar dados de forma eficiente: listas, pilhas, filas e mais.",
    modules: [
      {
        id: "lineares",
        title: "Estruturas Lineares",
        lessons: [
          {
            id: "arrays-e-listas",
            title: "Arrays e listas",
            content:
              "Arrays (vetores) guardam elementos em posições sequenciais de memória, permitindo acesso rápido por índice. Listas ligadas guardam elementos conectados por referências, com inserção/remoção mais eficiente em certos casos, mas acesso sequencial mais lento.",
          },
          {
            id: "pilhas-e-filas",
            title: "Pilhas e filas",
            content:
              "Uma pilha (stack) segue a lógica LIFO (último a entrar, primeiro a sair) — como uma pilha de pratos. Uma fila (queue) segue a lógica FIFO (primeiro a entrar, primeiro a sair) — como uma fila de banco.",
          },
        ],
      },
    ],
  },
  {
    id: "fundamentos-de-ia",
    title: "Fundamentos de Inteligência Artificial",
    category: "Tecnologia",
    description:
      "Conceitos essenciais de IA e machine learning para quem está começando na área.",
    modules: [
      {
        id: "conceitos-basicos",
        title: "Conceitos Básicos",
        lessons: [
          {
            id: "o-que-e-ia",
            title: "O que é Inteligência Artificial",
            content:
              "Inteligência Artificial é o campo da computação dedicado a criar sistemas capazes de executar tarefas que, tipicamente, exigiriam inteligência humana: reconhecer padrões, tomar decisões, entender linguagem natural, entre outras.",
          },
          {
            id: "machine-learning",
            title: "Machine Learning",
            content:
              "Machine Learning é um subcampo da IA em que sistemas aprendem padrões a partir de dados, em vez de seguir regras explicitamente programadas. Um modelo é treinado com exemplos e, depois, consegue generalizar para dados novos.",
          },
        ],
      },
      {
        id: "modelos-de-linguagem",
        title: "Modelos de Linguagem",
        lessons: [
          {
            id: "llms",
            title: "O que são LLMs",
            content:
              "Large Language Models (LLMs) são modelos de IA treinados em grandes volumes de texto para prever e gerar linguagem natural. Eles são a base de assistentes conversacionais como este tutor do site.",
          },
        ],
      },
    ],
  },
];

export function getCourses(): Course[] {
  return COURSES;
}

export function getCourse(courseId: string): Course | undefined {
  return COURSES.find((c) => c.id === courseId);
}

export function getLesson(
  courseId: string,
  lessonId: string
): { course: Course; module: Module; lesson: Lesson } | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) return { course, module: mod, lesson };
  }
  return undefined;
}

export function countLessons(course: Course): number {
  return course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// --- Módulos e lições personalizados (adicionados pelo usuário) ---

interface CustomModulesStore {
  [courseId: string]: Module[];
}

const CUSTOM_MODULES_FILE = path.join(DATA_DIR, "lms-custom-modules.json");

async function readCustomModulesStore(): Promise<CustomModulesStore> {
  try {
    const raw = await fs.readFile(CUSTOM_MODULES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCustomModulesStore(store: CustomModulesStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CUSTOM_MODULES_FILE, JSON.stringify(store, null, 2));
}

export async function getCustomModules(courseId: string): Promise<Module[]> {
  const store = await readCustomModulesStore();
  return store[courseId] ?? [];
}

export async function addCustomModule(
  courseId: string,
  title: string
): Promise<Module[]> {
  const store = await readCustomModulesStore();
  if (!store[courseId]) store[courseId] = [];
  store[courseId].push({
    id: `custom-modulo-${Date.now()}`,
    title,
    lessons: [],
  });
  await writeCustomModulesStore(store);
  return store[courseId];
}

export async function removeCustomModule(
  courseId: string,
  moduleId: string
): Promise<Module[]> {
  const store = await readCustomModulesStore();
  store[courseId] = (store[courseId] ?? []).filter((m) => m.id !== moduleId);
  await writeCustomModulesStore(store);
  return store[courseId];
}

export async function addCustomLesson(
  courseId: string,
  moduleId: string,
  title: string
): Promise<Module[]> {
  const store = await readCustomModulesStore();
  const mod = (store[courseId] ?? []).find((m) => m.id === moduleId);
  if (mod) {
    mod.lessons.push({
      id: `custom-licao-${Date.now()}`,
      title,
      content: "",
    });
    await writeCustomModulesStore(store);
  }
  return store[courseId] ?? [];
}

export async function getCourseWithCustomModules(
  courseId: string
): Promise<Course | undefined> {
  const course = await findAnyCourse(courseId);
  if (!course) return undefined;
  const customModules = await getCustomModules(courseId);
  return { ...course, modules: [...course.modules, ...customModules] };
}

export async function getLessonWithCustom(
  courseId: string,
  lessonId: string
): Promise<{ course: Course; module: Module; lesson: Lesson } | undefined> {
  const builtin = getLesson(courseId, lessonId);
  if (builtin) return builtin;

  const course = await findAnyCourse(courseId);
  if (!course) return undefined;
  const customModules = await getCustomModules(courseId);
  for (const mod of customModules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) return { course, module: mod, lesson };
  }
  return undefined;
}

// --- Cursos personalizados (criados pelo usuário) ---

const CUSTOM_COURSES_FILE = path.join(DATA_DIR, "lms-custom-courses.json");

async function readCustomCourses(): Promise<Course[]> {
  try {
    const raw = await fs.readFile(CUSTOM_COURSES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeCustomCourses(courses: Course[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CUSTOM_COURSES_FILE, JSON.stringify(courses, null, 2));
}

export async function getCustomCourses(): Promise<Course[]> {
  return readCustomCourses();
}

export async function getAllCourses(): Promise<Course[]> {
  return [...COURSES, ...(await getCustomCourses())];
}

export async function getAllCategories(): Promise<string[]> {
  const courses = await getAllCourses();
  return Array.from(new Set(courses.map((c) => c.category)));
}

export async function findAnyCourse(courseId: string): Promise<Course | undefined> {
  const builtin = getCourse(courseId);
  if (builtin) return builtin;
  const custom = await getCustomCourses();
  return custom.find((c) => c.id === courseId);
}

export function isCustomCourseId(courseId: string): boolean {
  return !getCourse(courseId);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addCustomCourse(
  title: string,
  description: string,
  category: string
): Promise<Course> {
  const courses = await readCustomCourses();
  const base = slugify(title) || "curso";
  let id = base;
  let n = 1;
  const existingIds = new Set([...COURSES.map((c) => c.id), ...courses.map((c) => c.id)]);
  while (existingIds.has(id)) {
    id = `${base}-${++n}`;
  }
  const course: Course = { id, title, description, category, modules: [] };
  courses.push(course);
  await writeCustomCourses(courses);
  return course;
}

export async function removeCustomCourse(courseId: string): Promise<void> {
  const courses = await readCustomCourses();
  await writeCustomCourses(courses.filter((c) => c.id !== courseId));

  // Limpa módulos, progresso e histórico de chat associados a esse curso.
  const modulesStore = await readCustomModulesStore();
  delete modulesStore[courseId];
  await writeCustomModulesStore(modulesStore);

  const progressStore = await readStore();
  for (const sessionId of Object.keys(progressStore)) {
    delete progressStore[sessionId][courseId];
  }
  await writeStore(progressStore);
}

interface ProgressStore {
  [sessionId: string]: {
    [courseId: string]: {
      completedLessons: string[];
    };
  };
}

const PROGRESS_FILE = path.join(DATA_DIR, "lms-progress.json");

async function readStore(): Promise<ProgressStore> {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(store: ProgressStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(store, null, 2));
}

export async function getProgress(
  sessionId: string,
  courseId: string
): Promise<string[]> {
  const store = await readStore();
  return store[sessionId]?.[courseId]?.completedLessons ?? [];
}

export async function getAllProgress(
  sessionId: string
): Promise<Record<string, string[]>> {
  const store = await readStore();
  const sessionData = store[sessionId] ?? {};
  const result: Record<string, string[]> = {};
  for (const courseId of Object.keys(sessionData)) {
    result[courseId] = sessionData[courseId].completedLessons;
  }
  return result;
}

export async function toggleLessonComplete(
  sessionId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<string[]> {
  const store = await readStore();
  if (!store[sessionId]) store[sessionId] = {};
  if (!store[sessionId][courseId]) {
    store[sessionId][courseId] = { completedLessons: [] };
  }
  const list = store[sessionId][courseId].completedLessons;
  const idx = list.indexOf(lessonId);
  if (completed && idx === -1) {
    list.push(lessonId);
  } else if (!completed && idx !== -1) {
    list.splice(idx, 1);
  }
  await writeStore(store);
  return list;
}
