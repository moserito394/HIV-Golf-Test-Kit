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
        tee.course_rating !== null &&
        tee.slope !== null
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
// CALCULATE WHS COURSE HANDICAP
// -------------------------

function calculateCourseHandicap(
  handicapIndex,
  slope,
  courseRating,
  par
) {

  if (
    isNaN(handicapIndex) ||
    isNaN(slope) ||
    isNaN(courseRating) ||
    isNaN(par)
  ) {

    return null;
  }


  // WHS formula:
  //
  // Course Handicap =
  // Handicap Index × (Slope / 113)
  // + (Course Rating - Par)

  const courseHandicap =
    handicapIndex *
      (slope / 113) +
    (courseRating - par);


  return courseHandicap;
}


// -------------------------
// GET SELECTED TEE
// -------------------------

async function getSelectedTee(teeId) {

  const tees = await supabaseRequest(
    "tees",
    `?id=eq.${teeId}&select=id,name,course_id,course_rating,slope`
  );

  if (tees.length === 0) {
    throw new Error("Selected tee could not be found.");
  }

  return tees[0];
}


// -------------------------
// GET COURSE
// -------------------------

async function getCourse(courseId) {

  const courses = await supabaseRequest(
    "courses",
    `?id=eq.${courseId}&select=id,name,par`
  );

  if (courses.length === 0) {
    throw new Error("Selected course could not be found.");
  }

  return courses[0];
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

        <div>
          <strong>
            Gross Score:
            <span id="totalScore">0</span>
          </strong>
        </div>

        <div>
          <strong>
            Course Handicap:
            <span id="courseHandicap">-</span>
          </strong>
        </div>

        <div>
          <strong>
            Net Score:
            <span id="netScore">-</span>
          </strong>
        </div>

      </div>
    `;

    scorecard.innerHTML = html;


    document
      .querySelectorAll(".score-input")
      .forEach(input => {

        input.addEventListener(
          "input",
          updateTotal
        );

      });


    // Recalculate when scorecard loads
    updateTotal();


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
// CALCULATE GROSS + WHS NET
// -------------------------

async function updateTotal() {

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


  // -------------------------
  // GROSS SCORE
  // -------------------------

  const totalElement =
    document.getElementById("totalScore");

  if (totalElement) {
    totalElement.textContent = total;
  }


  // -------------------------
  // GET HANDICAP
  // -------------------------

  const handicapInput =
    document.getElementById("handicap");

  const handicap =
    parseFloat(
      handicapInput?.value
    );


  const netElement =
    document.getElementById("netScore");

  const courseHandicapElement =
    document.getElementById("courseHandicap");


  // If there is no handicap yet,
  // clear the handicap calculations.

  if (
    isNaN(handicap) ||
    handicap < 0 ||
    handicap > 54
  ) {

    if (courseHandicapElement) {
      courseHandicapElement.textContent = "-";
    }

    if (netElement) {
      netElement.textContent = "-";
    }

    return;
  }


  // -------------------------
  // GET COURSE + TEE
  // -------------------------

  const courseId =
    document.getElementById("course")?.value;

  const teeId =
    document.getElementById("tee")?.value;


  if (!courseId || !teeId) {

    if (courseHandicapElement) {
      courseHandicapElement.textContent = "-";
    }

    if (netElement) {
      netElement.textContent = "-";
    }

    return;
  }


  try {

    const [course, tee] =
      await Promise.all([
        getCourse(courseId),
        getSelectedTee(teeId)
      ]);


    // -------------------------
    // CALCULATE COURSE HANDICAP
    // -------------------------

    const calculatedCourseHandicap =
      calculateCourseHandicap(
        handicap,
        parseFloat(tee.slope),
        parseFloat(tee.course_rating),
        parseFloat(course.par)
      );


    if (calculatedCourseHandicap === null) {

      if (courseHandicapElement) {
        courseHandicapElement.textContent = "-";
      }

      if (netElement) {
        netElement.textContent = "-";
      }

      return;
    }


    // WHS retains the unrounded Course Handicap
    // until the appropriate rounding step.
    //
    // For our 100% allowance competition,
    // the Playing Handicap is the Course Handicap
    // rounded to the nearest whole number.

    const playingHandicap =
      Math.floor(
        calculatedCourseHandicap + 0.5
      );


    // -------------------------
    // DISPLAY COURSE HANDICAP
    // -------------------------

    if (courseHandicapElement) {

      courseHandicapElement.textContent =
        playingHandicap;

    }


    // -------------------------
    // CALCULATE NET SCORE
    // -------------------------

    if (netElement) {

      const netScore =
        total - playingHandicap;

      netElement.textContent =
        netScore;

    }


  } catch (error) {

    console.error(
      "Could not calculate handicap:",
      error
    );

    if (courseHandicapElement) {
      courseHandicapElement.textContent = "-";
    }

    if (netElement) {
      netElement.textContent = "-";
    }

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


  const handicap =
    parseFloat(
      document
        .getElementById("handicap")
        .value
    );


  const roundDate =
    document
      .getElementById("roundDate")
      .value;


  const courseId =
    document
      .getElementById("course")
      .value;


  const teeId =
    document
      .getElementById("tee")
      .value;


  const message =
    document
      .getElementById("submitMessage");


  // -------------------------
  // VALIDATE PLAYER
  // -------------------------

  if (!playerName) {

    message.textContent =
      "Please enter your name.";

    return;
  }


  // -------------------------
  // VALIDATE HANDICAP
  // -------------------------

  if (
    isNaN(handicap) ||
    handicap < 0 ||
    handicap > 54
  ) {

    message.textContent =
      "Please enter a valid handicap.";

    return;
  }


  // -------------------------
  // VALIDATE DATE
  // -------------------------

  if (!roundDate) {

    message.textContent =
      "Please select the date of the round.";

    return;
  }


  // -------------------------
  // VALIDATE COURSE
  // -------------------------

  if (!courseId) {

    message.textContent =
      "Please select a course.";

    return;
  }


  // -------------------------
  // VALIDATE TEE
  // -------------------------

  if (!teeId) {

    message.textContent =
      "Please select a tee.";

    return;
  }


  // -------------------------
  // GET SCORES
  // -------------------------

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


  // -------------------------
  // CALCULATE GROSS SCORE
  // -------------------------

  const grossScore =
    scores.reduce(
      (total, score) =>
        total + score.strokes,
      0
    );


  // -------------------------
  // GET COURSE + TEE DATA
  // -------------------------

  let course;
  let tee;
  let courseHandicap;
  let playingHandicap;
  let netScore;


  try {

    [course, tee] =
      await Promise.all([
        getCourse(courseId),
        getSelectedTee(teeId)
      ]);


    // -------------------------
    // WHS COURSE HANDICAP
    // -------------------------

    courseHandicap =
      calculateCourseHandicap(
        handicap,
        parseFloat(tee.slope),
        parseFloat(tee.course_rating),
        parseFloat(course.par)
      );


    if (courseHandicap === null) {

      message.textContent =
        "Could not calculate your course handicap.";

      return;
    }


    // 100% handicap allowance
    playingHandicap =
      Math.floor(
        courseHandicap + 0.5
      );


    // -------------------------
    // NET SCORE
    // -------------------------

    netScore =
      grossScore - playingHandicap;


  } catch (error) {

    console.error(
      "Could not calculate WHS handicap:",
      error
    );

    message.textContent =
      "Could not calculate your handicap.";

    return;
  }


  console.log(
    "Handicap Index:",
    handicap
  );

  console.log(
    "Course Handicap:",
    courseHandicap
  );

  console.log(
    "Playing Handicap:",
    playingHandicap
  );

  console.log(
    "Gross Score:",
    grossScore
  );

  console.log(
    "Net Score:",
    netScore
  );


  message.textContent =
    "Submitting round...";


  // Disable button while submitting
  const submitButton =
    document.getElementById("submitRound");

  submitButton.disabled = true;


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
          handicap: handicap,
          played_at: roundDate
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


    // -------------------------
    // SUCCESS
    // -------------------------

    message.textContent =
      `✅ Round submitted! Gross: ${grossScore} | Course Handicap: ${playingHandicap} | Net: ${netScore}`;


  } catch (error) {

    console.error(
      "Could not submit round:",
      error
    );


    message.textContent =
      `Error submitting round: ${error.message}`;


  } finally {

    submitButton.disabled = false;

  }
}


// -------------------------
// START APP
// -------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {


    // -------------------------
    // DEFAULT ROUND DATE
    // -------------------------

    const roundDate =
      document.getElementById("roundDate");


    roundDate.value =
      new Date()
        .toISOString()
        .split("T")[0];


    // -------------------------
    // LOAD COURSES
    // -------------------------

    loadCourses();


    // -------------------------
    // FORM ELEMENTS
    // -------------------------

    const courseSelect =
      document.getElementById("course");


    const teeSelect =
      document.getElementById("tee");


    const handicapInput =
      document.getElementById("handicap");


    // -------------------------
    // COURSE CHANGE
    // -------------------------

    courseSelect.addEventListener(
      "change",
      () => {

        loadTees(
          courseSelect.value
        );


        document.getElementById(
          "scorecard"
        ).innerHTML =
          "<p>Select a tee to begin.</p>";

      }
    );


    // -------------------------
    // TEE CHANGE
    // -------------------------

    teeSelect.addEventListener(
      "change",
      () => {

        loadScorecard(
          courseSelect.value,
          teeSelect.value
        );

      }
    );


    // -------------------------
    // HANDICAP CHANGE
    // -------------------------

    handicapInput.addEventListener(
      "input",
      updateTotal
    );


    // -------------------------
    // SUBMIT BUTTON
    // -------------------------

    document
      .getElementById("submitRound")
      .addEventListener(
        "click",
        submitRound
      );

  }
);
