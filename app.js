const SUPABASE_URL = "https://edhnlhbmmztvflpjhwga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaG5saGJtbXp0dmZscGpod2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTc2MzAsImV4cCI6MjEwNTQzMzYzMH0.53CN7eiQ1q8-3KKQg6P0ckieVdKh-gQP4uiwn0ukSks";

// -------------------------
// SUPABASE REQUEST
// -------------------------

async function supabaseRequest(
  table,
  query = "",
  method = "GET",
  body = null
) {

  const options = {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}${query}`,
    options
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

  const courseSelect =
    document.getElementById("course");

  try {

    const courses = await supabaseRequest(
      "courses",
      "?active=eq.true&select=id,name,city,state,par&order=name"
    );

    courseSelect.innerHTML =
      '<option value="">Select a course</option>';

    courses.forEach(course => {

      const option =
        document.createElement("option");

      option.value = course.id;

      option.textContent =
        `${course.name} — Par ${course.par}`;

      courseSelect.appendChild(option);

    });

  } catch (error) {

    console.error(
      "Could not load courses:",
      error
    );

    courseSelect.innerHTML =
      '<option value="">Error loading courses</option>';
  }
}


// -------------------------
// LOAD TEES
// -------------------------

async function loadTees(courseId) {

  const teeSelect =
    document.getElementById("tee");

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

      const option =
        document.createElement("option");

      option.value = tee.id;

      let text =
        `${tee.name} — ${tee.yards} yards`;

      if (
        tee.course_rating &&
        tee.slope
      ) {

        text +=
          ` (${tee.course_rating}/${tee.slope})`;
      }

      option.textContent = text;

      teeSelect.appendChild(option);

    });

  } catch (error) {

    console.error(
      "Could not load tees:",
      error
    );

    teeSelect.innerHTML =
      '<option value="">Error loading tees</option>';
  }
}


// -------------------------
// LOAD SCORECARD
// -------------------------

async function loadScorecard(courseId, teeId) {

  const scorecard =
    document.getElementById("scorecard");

  if (!courseId || !teeId) {

    scorecard.innerHTML =
      "<p>Select a course and tee above to begin.</p>";

    return;
  }

  scorecard.innerHTML =
    "<p>Loading scorecard...</p>";

  try {

    const holes = await supabaseRequest(
      "holes",
      `?course_id=eq.${courseId}&select=id,hole_number,par,handicap&order=hole_number`
    );

    const teeHoles = await supabaseRequest(
      "tee_holes",
      `?tee_id=eq.${teeId}&select=hole_id,yardage`
    );

    const yardages = {};

    teeHoles.forEach(item => {
      yardages[item.hole_id] = item.yardage;
    });


    let html = `
      <div class="score-table">

        <div class="score-row score-header">
          <div>Hole</div>
          <div>Par</div>
          <div>Yards</div>
          <div>Score</div>
        </div>
    `;


    holes.forEach(hole => {

      const yardage =
        yardages[hole.id] ?? "-";

      html += `
        <div class="score-row">

          <div>
            <strong>${hole.hole_number}</strong>
          </div>

          <div>
            ${hole.par}
          </div>

          <div>
            ${yardage}
          </div>

          <div>

            <input
              type="number"
              class="score-input"
              min="1"
              max="20"
              data-hole-id="${hole.id}"
              data-hole-number="${hole.hole_number}"
              placeholder="-"
            >

          </div>

        </div>
      `;

    });


    html += `
      </div>

      <div class="score-total">

        <strong>
          Total Score:
          <span id="totalScore">0</span>
        </strong>

      </div>
    `;

    scorecard.innerHTML = html;


    // Update total whenever a score changes

    document
      .querySelectorAll(".score-input")
      .forEach(input => {

        input.addEventListener(
          "input",
          updateTotal
        );

      });

  } catch (error) {

    console.error(
      "Could not load scorecard:",
      error
    );

    scorecard.innerHTML =
      "<p>Could not load scorecard.</p>";
  }
}


// -------------------------
// CALCULATE TOTAL
// -------------------------

function updateTotal() {

  let total = 0;

  document
    .querySelectorAll(".score-input")
    .forEach(input => {

      const value =
        parseInt(input.value);

      if (!isNaN(value)) {
        total += value;
      }

    });

  const totalElement =
    document.getElementById("totalScore");

  if (totalElement) {
    totalElement.textContent = total;
  }
}


// -------------------------
// SUBMIT ROUND
// -------------------------

async function submitRound() {

  const playerName =
    document
      .getElementById("playerName")
      .value
      .trim();

  const courseId =
    document.getElementById("course").value;

  const teeId =
    document.getElementById("tee").value;

  const message =
    document.getElementById("submitMessage");


  if (!playerName) {

    message.textContent =
      "Please enter your name.";

    return;
  }

  if (!courseId) {

    message.textContent =
      "Please select a course.";

    return;
  }

  if (!teeId) {

    message.textContent =
      "Please select a tee.";

    return;
  }


  const scoreInputs =
    document.querySelectorAll(".score-input");


  if (scoreInputs.length !== 18) {

    message.textContent =
      "Please select a course and tee.";

    return;
  }


  const scores = [];

  for (const input of scoreInputs) {

    const strokes =
      parseInt(input.value);

    if (
      isNaN(strokes) ||
      strokes < 1 ||
      strokes > 20
    ) {

      message.textContent =
        "Please enter a score for every hole.";

      return;
    }

    scores.push({
      hole_id: input.dataset.holeId,
      strokes
    });

  }


  message.textContent =
    "Submitting round...";


  try {

    // -------------------------
    // FIND OR CREATE PLAYER
    // -------------------------

    const existingPlayers =
      await supabaseRequest(
        "players",
        `?name=eq.${encodeURIComponent(playerName)}&select=id,name`
      );


    let playerId;


    if (existingPlayers.length > 0) {

      playerId =
        existingPlayers[0].id;

    } else {

      const newPlayers =
        await supabaseRequest(
          "players",
          "",
          "POST",
          {
            name: playerName,
            active: true
          }
        );

      playerId =
        newPlayers[0].id;

    }


    // -------------------------
    // CREATE ROUND
    // -------------------------

    const rounds =
      await supabaseRequest(
        "rounds",
        "",
        "POST",
        {
          player_id: playerId,
          course_id: courseId,
          tee_id: teeId,
          played_at:
            new Date()
              .toISOString()
              .split("T")[0]
        }
      );


    const roundId =
      rounds[0].id;


    // -------------------------
    // SAVE SCORES
    // -------------------------

    const scoreRecords =
      scores.map(score => ({
        round_id: roundId,
        hole_id: score.hole_id,
        strokes: score.strokes
      }));


    await supabaseRequest(
      "scores",
      "",
      "POST",
      scoreRecords
    );


    message.textContent =
      "✅ Round submitted successfully!";

  } catch (error) {

    console.error(
      "Could not submit round:",
      error
    );

    message.textContent =
      `Error submitting round: ${error.message}`;
  }
}


// -------------------------
// START APP
// -------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadCourses();

    const courseSelect =
      document.getElementById("course");

    const teeSelect =
      document.getElementById("tee");


    courseSelect.addEventListener(
      "change",
      () => {

        loadTees(courseSelect.value);

        document.getElementById(
          "scorecard"
        ).innerHTML =
          "<p>Select a tee to begin.</p>";

      }
    );


    teeSelect.addEventListener(
      "change",
      () => {

        loadScorecard(
          courseSelect.value,
          teeSelect.value
        );

      }
    );


    document
      .getElementById("submitRound")
      .addEventListener(
        "click",
        submitRound
      );

  }
);
