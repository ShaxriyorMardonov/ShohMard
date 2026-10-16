import { PrismaClient, type QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminLogin = (process.env.SEED_ADMIN_LOGIN ?? "admin").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "SamuAdmin2026";
  const demo = process.env.SEED_DEMO !== "false";

  await prisma.user.upsert({
    where: { login: adminLogin },
    update: {},
    create: {
      login: adminLogin,
      fullName: "Bosh administrator",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });
  console.log(`Administrator: ${adminLogin}`);
  if (!demo) return;

  const unis = await Promise.all(
    [
      { name: "Toshkent davlat texnika universiteti", shortName: "TDTU", city: "Toshkent" },
      { name: "Samarqand davlat universiteti", shortName: "SamDU", city: "Samarqand" },
      { name: "Farg'ona davlat universiteti", shortName: "FarDU", city: "Farg'ona" },
    ].map((u) => prisma.university.upsert({ where: { name: u.name }, update: {}, create: u })),
  );

  const studentPassword = await bcrypt.hash(process.env.SEED_STUDENT_PASSWORD ?? "Talaba2026", 12);
  const students = [
    { login: "talaba1", fullName: "Karimov Jasur Anvarovich", faculty: "Kompyuter injiniringi", groupName: "KI-21", uni: 0 },
    { login: "talaba2", fullName: "Rahimova Malika Shavkatovna", faculty: "Kompyuter injiniringi", groupName: "KI-22", uni: 0 },
    { login: "talaba3", fullName: "Tursunov Bekzod Olimovich", faculty: "Matematika", groupName: "MT-11", uni: 1 },
    { login: "talaba4", fullName: "Yusupova Dilnoza Rustamovna", faculty: "Fizika-matematika", groupName: "FM-31", uni: 2 },
  ];
  for (const s of students) {
    const universityId = unis[s.uni]!.id;
    const faculty = await prisma.faculty.upsert({
      where: { universityId_name: { universityId, name: s.faculty } },
      update: {},
      create: { universityId, name: s.faculty },
    });
    const group = await prisma.group.upsert({
      where: { universityId_name: { universityId, name: s.groupName } },
      update: {},
      create: { universityId, name: s.groupName, facultyId: faculty.id },
    });
    await prisma.user.upsert({
      where: { login: s.login },
      update: {},
      create: {
        login: s.login,
        fullName: s.fullName,
        role: "STUDENT",
        universityId,
        facultyId: faculty.id,
        groupId: group.id,
        studyForm: "KUNDUZGI",
        passwordHash: studentPassword,
      },
    });
  }

  if ((await prisma.question.count()) > 0) {
    console.log("Savollar allaqachon mavjud — demo testlar qayta yaratilmadi.");
    return;
  }

  type Q = { text: string; type: QuestionType; subject: string; options: [string, boolean][]; explanation?: string };
  const math: Q[] = [
    { text: "2x + 6 = 14 tenglamaning yechimi nechiga teng?", type: "SINGLE", subject: "Matematika", options: [["3", false], ["4", true], ["5", false], ["10", false]] },
    { text: "Quyidagilardan qaysilari tub sonlar?", type: "MULTIPLE", subject: "Matematika", options: [["2", true], ["9", false], ["13", true], ["21", false]], explanation: "Tub son faqat 1 va o'ziga bo'linadi." },
    { text: "Uchburchak ichki burchaklari yig'indisi 180° ga teng.", type: "TRUE_FALSE", subject: "Matematika", options: [["To'g'ri", true], ["Noto'g'ri", false]] },
    { text: "f(x) = x² funksiyaning hosilasi qaysi?", type: "SINGLE", subject: "Matematika", options: [["x", false], ["2x", true], ["x²/2", false], ["2", false]] },
    { text: "log₂(8) qiymati nechiga teng?", type: "SINGLE", subject: "Matematika", options: [["2", false], ["3", true], ["4", false], ["8", false]] },
    { text: "Har qanday juft son 4 ga bo'linadi.", type: "TRUE_FALSE", subject: "Matematika", options: [["To'g'ri", false], ["Noto'g'ri", true]] },
  ];
  const it: Q[] = [
    { text: "HTTP protokolida ma'lumot yaratish uchun odatda qaysi metod ishlatiladi?", type: "SINGLE", subject: "Informatika", options: [["GET", false], ["POST", true], ["HEAD", false], ["OPTIONS", false]] },
    { text: "Quyidagilardan qaysilari ma'lumotlar bazasi boshqaruv tizimlari?", type: "MULTIPLE", subject: "Informatika", options: [["PostgreSQL", true], ["MySQL", true], ["Photoshop", false], ["SQLite", true]] },
    { text: "1 bayt 8 bitdan iborat.", type: "TRUE_FALSE", subject: "Informatika", options: [["To'g'ri", true], ["Noto'g'ri", false]] },
    { text: "Ikkilik sanoq sistemasidagi 1010 soni o'nlik sistemada nechaga teng?", type: "SINGLE", subject: "Informatika", options: [["8", false], ["10", true], ["12", false], ["5", false]] },
    { text: "Qaysi ma'lumotlar tuzilmasi LIFO tamoyili asosida ishlaydi?", type: "SINGLE", subject: "Informatika", options: [["Navbat (queue)", false], ["Stek (stack)", true], ["Daraxt", false], ["Graf", false]] },
  ];
  const lang: Q[] = [
    { text: "\"Kitob\" so'zining ko'plik shakli qaysi?", type: "SINGLE", subject: "O'zbek tili", options: [["Kitoblar", true], ["Kitobi", false], ["Kitobda", false], ["Kitobni", false]] },
    { text: "O'zbek lotin alifbosida \"sh\" harf birikmasi bitta tovushni ifodalaydi.", type: "TRUE_FALSE", subject: "O'zbek tili", options: [["To'g'ri", true], ["Noto'g'ri", false]] },
    { text: "Quyidagilardan qaysilari fe'l?", type: "MULTIPLE", subject: "O'zbek tili", options: [["o'qimoq", true], ["chiroyli", false], ["yozmoq", true], ["daftar", false]] },
  ];

  async function createQuestions(list: Q[]) {
    const ids: string[] = [];
    for (const q of list) {
      const created = await prisma.question.create({
        data: {
          text: q.text,
          type: q.type,
          subject: q.subject,
          explanation: q.explanation ?? null,
          options: { create: q.options.map(([text, isCorrect], i) => ({ text, isCorrect, position: i })) },
        },
      });
      ids.push(created.id);
    }
    return ids;
  }
  const mathIds = await createQuestions(math);
  const itIds = await createQuestions(it);
  const langIds = await createQuestions(lang);

  const admin = await prisma.user.findUniqueOrThrow({ where: { login: adminLogin } });
  const now = Date.now();
  const H = 3600_000;
  const D = 24 * H;

  async function createTest(data: {
    title: string;
    subject: string;
    description: string;
    duration: number;
    start: number;
    end: number;
    release: "IMMEDIATE" | "AFTER_END" | "MANUAL";
    uniIdx: number[];
    questions: string[];
  }) {
    await prisma.test.create({
      data: {
        title: data.title,
        subject: data.subject,
        description: data.description,
        durationMinutes: data.duration,
        startsAt: new Date(data.start),
        endsAt: new Date(data.end),
        resultRelease: data.release,
        isPublished: true,
        createdById: admin.id,
        universities: { connect: data.uniIdx.map((i) => ({ id: unis[i]!.id })) },
        questions: { create: data.questions.map((questionId, position) => ({ questionId, position, points: 1 })) },
      },
    });
  }

  await createTest({
    title: "Oliy matematika — oraliq nazorat",
    subject: "Matematika",
    description: "Algebra va matematik analiz asoslari bo'yicha oraliq nazorat.",
    duration: 30,
    start: now - H,
    end: now + 7 * D,
    release: "IMMEDIATE",
    uniIdx: [0, 1, 2],
    questions: mathIds,
  });
  await createTest({
    title: "Informatika asoslari",
    subject: "Informatika",
    description: "Kompyuter tizimlari, tarmoqlar va ma'lumotlar tuzilmalari.",
    duration: 20,
    start: now - H,
    end: now + 3 * D,
    release: "AFTER_END",
    uniIdx: [0],
    questions: itIds,
  });
  await createTest({
    title: "O'zbek tili — yakuniy nazorat",
    subject: "O'zbek tili",
    description: "Morfologiya va imlo qoidalari.",
    duration: 15,
    start: now + 2 * D,
    end: now + 4 * D,
    release: "MANUAL",
    uniIdx: [0, 1, 2],
    questions: langIds,
  });
  console.log("Demo ma'lumotlar yaratildi: 3 universitet, 4 talaba, 14 savol, 3 test.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
