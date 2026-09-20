const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

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
