const SUPABASE_URL = "https://edhnlhbmmztvflpjhwga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaG5saGJtbXp0dmZscGpod2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTc2MzAsImV4cCI6MjEwNTQzMzYzMH0.53CN7eiQ1q8-3KKQg6P0ckieVdKh-gQP4uiwn0ukSks";

async function supabaseRequest(table, query = "") {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}${query}`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function loadCourses() {
  try {
    const courses = await supabaseRequest(
      "courses",
      "?active=eq.true&select=id,name,city,state,par&order=name"
    );

    const courseSelect = document.getElementById("course");

    courses.forEach(course => {
      const option = document.createElement("option");

      option.value = course.id;
      option.textContent = `${course.name} — Par ${course.par}`;

      courseSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Could not load courses:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadCourses);
