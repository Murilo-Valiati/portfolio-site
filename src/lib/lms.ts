import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";

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

/*
 * Persistência: tudo via json-store (lock + rename atômico), como o resto do
 * site. Progresso, quiz e chat pertencem a uma identidade fixa — há um único
 * aluno, o dono do site, já autenticado pelo painel. (Auditoria de 30/08.)
 */

const ALUNO = "aluno";
const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");

// --- Módulos e lições personalizados (adicionados pelo usuário) ---

interface CustomModulesStore {
  [courseId: string]: Module[];
}

const CUSTOM_MODULES_FILE = path.join(DATA_DIR, "lms-custom-modules.json");

async function readCustomModulesStore(): Promise<CustomModulesStore> {
  return readJson<CustomModulesStore>(CUSTOM_MODULES_FILE, {});
}

export async function getCustomModules(courseId: string): Promise<Module[]> {
  const store = await readCustomModulesStore();
  return store[courseId] ?? [];
}

export async function addCustomModule(
  courseId: string,
  title: string
): Promise<Module[]> {
  return withLock(CUSTOM_MODULES_FILE, async () => {
    const store = await readCustomModulesStore();
    if (!store[courseId]) store[courseId] = [];
    store[courseId].push({
      id: `custom-modulo-${Date.now()}`,
      title,
      lessons: [],
    });
    await writeJsonAtomic(CUSTOM_MODULES_FILE, store);
    return store[courseId];
  });
}

export async function removeCustomModule(
  courseId: string,
  moduleId: string
): Promise<Module[]> {
  return withLock(CUSTOM_MODULES_FILE, async () => {
    const store = await readCustomModulesStore();
    store[courseId] = (store[courseId] ?? []).filter((m) => m.id !== moduleId);
    await writeJsonAtomic(CUSTOM_MODULES_FILE, store);
    return store[courseId];
  });
}

export async function addCustomLesson(
  courseId: string,
  moduleId: string,
  title: string
): Promise<Module[]> {
  return withLock(CUSTOM_MODULES_FILE, async () => {
    const store = await readCustomModulesStore();
    const mod = (store[courseId] ?? []).find((m) => m.id === moduleId);
    if (mod) {
      mod.lessons.push({
        id: `custom-licao-${Date.now()}`,
        title,
        content: "",
      });
      await writeJsonAtomic(CUSTOM_MODULES_FILE, store);
    }
    return store[courseId] ?? [];
  });
}

/** Preenche (ou reescreve) o texto de uma lição personalizada. */
export async function updateCustomLessonContent(
  courseId: string,
  lessonId: string,
  content: string
): Promise<Lesson | null> {
  return withLock(CUSTOM_MODULES_FILE, async () => {
    const store = await readCustomModulesStore();
    for (const mod of store[courseId] ?? []) {
      const lesson = mod.lessons.find((l) => l.id === lessonId);
      if (lesson) {
        lesson.content = content;
        await writeJsonAtomic(CUSTOM_MODULES_FILE, store);
        return lesson;
      }
    }
    return null;
  });
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
  return readJson<Course[]>(CUSTOM_COURSES_FILE, []);
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addCustomCourse(
  title: string,
  description: string,
  category: string
): Promise<Course> {
  return withLock(CUSTOM_COURSES_FILE, async () => {
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
    await writeJsonAtomic(CUSTOM_COURSES_FILE, courses);
    return course;
  });
}

export async function removeCustomCourse(courseId: string): Promise<void> {
  await withLock(CUSTOM_COURSES_FILE, async () => {
    const courses = await readCustomCourses();
    await writeJsonAtomic(
      CUSTOM_COURSES_FILE,
      courses.filter((c) => c.id !== courseId)
    );
  });

  // Limpa módulos, progresso e resultados de quiz associados ao curso.
  await withLock(CUSTOM_MODULES_FILE, async () => {
    const modulesStore = await readCustomModulesStore();
    delete modulesStore[courseId];
    await writeJsonAtomic(CUSTOM_MODULES_FILE, modulesStore);
  });

  await withLock(PROGRESS_FILE, async () => {
    const progressStore = await lerProgresso();
    for (const chave of Object.keys(progressStore)) {
      delete progressStore[chave][courseId];
    }
    await writeJsonAtomic(PROGRESS_FILE, progressStore);
  });

  await withLock(QUIZ_RESULTS_FILE, async () => {
    const quizStore = await readJson<QuizResultsStore>(QUIZ_RESULTS_FILE, {});
    delete quizStore[courseId];
    await writeJsonAtomic(QUIZ_RESULTS_FILE, quizStore);
  });
}

// --- Progresso ---

interface ProgressStore {
  [key: string]: {
    [courseId: string]: {
      completedLessons: string[];
    };
  };
}

const PROGRESS_FILE = path.join(DATA_DIR, "lms-progress.json");

/** Funde as sessões anônimas antigas na identidade fixa. Idempotente. */
async function lerProgresso(): Promise<ProgressStore> {
  const bruto = await readJson<ProgressStore>(PROGRESS_FILE, {});
  const antigas = Object.keys(bruto).filter((k) => k !== ALUNO);
  if (antigas.length === 0) return bruto;

  const destino = bruto[ALUNO] ?? {};
  for (const chave of antigas) {
    for (const [courseId, dados] of Object.entries(bruto[chave])) {
      const lista = destino[courseId]?.completedLessons ?? [];
      destino[courseId] = {
        completedLessons: Array.from(new Set([...lista, ...dados.completedLessons])),
      };
    }
  }
  const migrado: ProgressStore = { [ALUNO]: destino };
  await writeJsonAtomic(PROGRESS_FILE, migrado);
  return migrado;
}

export async function getProgress(courseId: string): Promise<string[]> {
  const store = await lerProgresso();
  return store[ALUNO]?.[courseId]?.completedLessons ?? [];
}

export async function getAllProgress(): Promise<Record<string, string[]>> {
  const store = await lerProgresso();
  const dados = store[ALUNO] ?? {};
  const result: Record<string, string[]> = {};
  for (const courseId of Object.keys(dados)) {
    result[courseId] = dados[courseId].completedLessons;
  }
  return result;
}

export async function toggleLessonComplete(
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<string[]> {
  return withLock(PROGRESS_FILE, async () => {
    const store = await lerProgresso();
    if (!store[ALUNO]) store[ALUNO] = {};
    if (!store[ALUNO][courseId]) {
      store[ALUNO][courseId] = { completedLessons: [] };
    }
    const list = store[ALUNO][courseId].completedLessons;
    const idx = list.indexOf(lessonId);
    if (completed && idx === -1) {
      list.push(lessonId);
    } else if (!completed && idx !== -1) {
      list.splice(idx, 1);
    }
    await writeJsonAtomic(PROGRESS_FILE, store);
    return list;
  });
}

// --- Resultados de quiz ---

export interface QuizAttempt {
  date: string; // ISO
  score: number;
  total: number;
  /** Enunciados das questões erradas, pra revisão. */
  erradas: string[];
}

interface QuizResultsStore {
  [courseId: string]: {
    [lessonId: string]: QuizAttempt[];
  };
}

const QUIZ_RESULTS_FILE = path.join(DATA_DIR, "lms-quiz-results.json");
const MAX_TENTATIVAS_GUARDADAS = 20;

export async function registerQuizResult(
  courseId: string,
  lessonId: string,
  attempt: Omit<QuizAttempt, "date">
): Promise<QuizAttempt> {
  return withLock(QUIZ_RESULTS_FILE, async () => {
    const store = await readJson<QuizResultsStore>(QUIZ_RESULTS_FILE, {});
    if (!store[courseId]) store[courseId] = {};
    const registro: QuizAttempt = { date: new Date().toISOString(), ...attempt };
    const lista = store[courseId][lessonId] ?? [];
    lista.push(registro);
    store[courseId][lessonId] = lista.slice(-MAX_TENTATIVAS_GUARDADAS);
    await writeJsonAtomic(QUIZ_RESULTS_FILE, store);
    return registro;
  });
}

export async function getQuizResults(
  courseId: string
): Promise<Record<string, QuizAttempt[]>> {
  const store = await readJson<QuizResultsStore>(QUIZ_RESULTS_FILE, {});
  return store[courseId] ?? {};
}
