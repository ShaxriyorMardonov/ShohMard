-- Talabalarni yangi universitetlarga o'tkazish: birinchi ikkita talaba "Malaka oshirish"ga,
-- keyingi ikkitasi "Soliq oliy maktabi"ga (yaratilish tartibida). Eski universitetning
-- fakultet/guruhi yangi universitetga tegishli bo'lmagani uchun ular tozalanadi.
-- Universitetlardan biri topilmasa yoki talabalar soni 4 ta bo'lmasa, hech narsa o'zgarmaydi.
DO $$
DECLARE
  malaka TEXT;
  soliq TEXT;
  ids TEXT[];
BEGIN
  SELECT id INTO malaka FROM "University" WHERE name ILIKE '%malaka oshirish%' ORDER BY "createdAt" LIMIT 1;
  SELECT id INTO soliq FROM "University" WHERE name ILIKE '%soliq oliy maktab%' ORDER BY "createdAt" LIMIT 1;
  SELECT array_agg(id ORDER BY "createdAt", id) INTO ids FROM "User" WHERE role = 'STUDENT';

  IF malaka IS NULL OR soliq IS NULL OR cardinality(ids) IS DISTINCT FROM 4 THEN
    RAISE NOTICE 'Talabalar ko''chirilmadi: malaka=%, soliq=%, talabalar=%', malaka, soliq, cardinality(ids);
    RETURN;
  END IF;

  UPDATE "User" SET "universityId" = malaka, "facultyId" = NULL, "groupId" = NULL, "updatedAt" = now() WHERE id = ANY(ids[1:2]);
  UPDATE "User" SET "universityId" = soliq, "facultyId" = NULL, "groupId" = NULL, "updatedAt" = now() WHERE id = ANY(ids[3:4]);
END $$;
