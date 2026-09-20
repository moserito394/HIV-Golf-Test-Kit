const SUPABASE_URL = "https://edhnlhbmmztvflpjhwga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaG5saGJtbXp0dmZscGpod2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTc2MzAsImV4cCI6MjEwNTQzMzYzMH0.53CN7eiQ1q8-3KKQg6P0ckieVdKh-gQP4uiwn0ukSks";

async function supabaseRequest(table, query = "") {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}${query}`,
    {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase error ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : [];
}


// -------------------------
// LOAD COURSES
// -------------------------

async function loadCourses() {
  const courseSelect = document.getElementById("course");

  try {
    const courses = await supabaseRequest(
      "courses",
      "?active=eq.true&select=id,name,city,state,par&order=name"
    );

    courseSelect.innerHTML =
      '<option value="">Select a course</option>';

    courses.forEach(course => {
      const option = document.createElement("option");

      option.value = course.id;
      option.textContent =
        `${course.name} — Par ${course.par}`;

      courseSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Could not load courses:", error);

    courseSelect.innerHTML =
      '<option value="">Error loading courses</option>';
  }
}


// -------------------------
// LOAD TEES
// -------------------------

async function loadTees(courseId) {
  const teeSelect = document.getElementById("tee");

  teeSelect.innerHTML =
    '<option value="">Loading tees...</option>';

  if (!courseId) {
    teeSelect.innerHTML =
      '<option value="">Select a course first</option>';

    return;
  }

  try {
    const tees = await supabaseRequest(
      "tees",
      `?course_id=eq.${courseId}&select=id,name,gender,yards,course_rating,slope&order=name`
    );

    teeSelect.innerHTML =
      '<option value="">Select a tee</option>';

    tees.forEach(tee => {
      const option = document.createElement("option");

      option.value = tee.id;

      let text = `${tee.name} — ${tee.yards} yards`;

      if (tee.course_rating && tee.slope) {
        text += ` (${tee.course_rating}/${tee.slope})`;
      }

      option.textContent = text;

      teeSelect.appendChild(option);
    });

    if (tees.length === 0) {
      teeSelect.innerHTML =
        '<option value="">No tees found</option>';
    }

  } catch (error) {
    console.error("Could not load tees:", error);

    teeSelect.innerHTML =
      '<option value="">Error loading tees</option>';
  }
}


// -------------------------
// START APP
// -------------------------

document.addEventListener("DOMContentLoaded", () => {

  loadCourses();

  const courseSelect =
    document.getElementById("course");

  courseSelect.addEventListener("change", () => {
    loadTees(courseSelect.value);
  });

});
