const SUPABASE_URL = "https://edhnlhbmmztvflpjhwga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaG5saGJtbXp0dmZscGpod2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTc2MzAsImV4cCI6MjEwNTQzMzYzMH0.53CN7eiQ1q8-3KKQg6P0ckieVdKh-gQP4uiwn0ukSks";


// -------------------------
// SUPABASE REQUEST
// -------------------------

async function supabaseRequest(
  table,
  query = ""
) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}${query}`,
    {
      method: "GET",

      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization":
          `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );


  const text =
    await response.text();


  if (!response.ok) {

    throw new Error(
      `Supabase error ${response.status}: ${text}`
    );

  }


  return text
    ? JSON.parse(text)
    : [];
}


// -------------------------
// LOAD COURSE
// -------------------------

async function getCourse(courseId) {

  const courses =
    await supabaseRequest(
      "courses",
      `?id=eq.${courseId}&select=id,name,par`
    );


  if (courses.length === 0) {

    throw new Error(
      "Course not found."
    );

  }


  return courses[0];
}


// -------------------------
// LOAD ROUNDS
// -------------------------

async function loadRounds(courseId) {

  const leaderboard =
    document.getElementById(
      "leaderboard"
    );

  const header =
    document.getElementById(
      "leaderboardHeader"
    );


  leaderboard.innerHTML =
    `<p class="loading">
      Loading leaderboard...
    </p>`;


  try {

    // Get course information
    const course =
      await getCourse(courseId);


    // Get all rounds for this course
    const rounds =
      await supabaseRequest(
        "rounds",
        `?course_id=eq.${courseId}&select=id,player_id,tee_id,handicap,played_at&order=played_at.asc,id.asc`
      );


    // Display course heading
    header.innerHTML = `
      <h2 class="leaderboard-title">
        ${course.name}
      </h2>

      <p class="leaderboard-subtitle">
        Par ${course.par} — Net Leaderboard
      </p>
    `;


    // No rounds yet
    if (rounds.length === 0) {

      leaderboard.innerHTML =
        `<p class="no-rounds">
          No rounds have been submitted for this course yet.
        </p>`;

      return;
    }


    // -------------------------
    // LOAD PLAYERS
    // -------------------------

    const playerIds =
      [
        ...new Set(
          rounds.map(
            round => round.player_id
          )
        )
      ];


    const players =
      await supabaseRequest(
        "players",
        `?id=in.(${playerIds.join(",")})&select=id,name`
      );


    const playerMap = {};


    players.forEach(player => {

      playerMap[player.id] =
        player.name;

    });


    // -------------------------
    // LOAD TEES
    // -------------------------

    const teeIds =
      [
        ...new Set(
          rounds.map(
            round => round.tee_id
          )
        )
      ];


    const tees =
      await supabaseRequest(
        "tees",
        `?id=in.(${teeIds.join(",")})&select=id,name,course_rating,slope`
      );


    const teeMap = {};


    tees.forEach(tee => {

      teeMap[tee.id] =
        tee;

    });


    // -------------------------
    // LOAD SCORES
    // -------------------------

    const roundIds =
      rounds.map(
        round => round.id
      );


    const scores =
      await supabaseRequest(
        "scores",
        `?round_id=in.(${roundIds.join(",")})&select=round_id,strokes`
      );


    // Calculate gross score for each round
    const grossScores = {};


    scores.forEach(score => {

      if (
        !grossScores[score.round_id]
      ) {

        grossScores[score.round_id] = 0;

      }


      grossScores[score.round_id] +=
        Number(score.strokes);

    });


    // -------------------------
    // CALCULATE LEADERBOARD
    // -------------------------

    const leaderboardRows =
      rounds.map(round => {

        const tee =
          teeMap[round.tee_id];


        const grossScore =
          grossScores[round.id] || 0;


        const handicapIndex =
          Number(round.handicap);


        const courseRating =
          Number(tee.course_rating);


        const slope =
          Number(tee.slope);


        const par =
          Number(course.par);


        // WHS Course Handicap
        const courseHandicap =
          handicapIndex *
            (slope / 113) +
          (courseRating - par);


        // 100% playing handicap
        const playingHandicap =
          Math.floor(
            courseHandicap + 0.5
          );


        // Net score
        const netScore =
          grossScore -
          playingHandicap;


        return {

          roundId:
            round.id,

          player:
            playerMap[round.player_id] ||
            "Unknown Player",

          grossScore,

          handicapIndex,

          courseHandicap:
            playingHandicap,

          netScore,

          tee:
            tee.name,

          date:
            round.played_at

        };

      });


    // -------------------------
    // SORT BY NET SCORE
    // -------------------------

    leaderboardRows.sort(
      (a, b) => {

        if (
          a.netScore !==
          b.netScore
        ) {

          return (
            a.netScore -
            b.netScore
          );

        }


        // Same net score:
        // lower gross score first

        if (
          a.grossScore !==
          b.grossScore
        ) {

          return (
            a.grossScore -
            b.grossScore
          );

        }


        // Same gross score:
        // earlier round first

        return (
          new Date(a.date) -
          new Date(b.date)
        );

      }
    );


    // -------------------------
    // BUILD TABLE
    // -------------------------

    let html = `

      <div class="leaderboard-table-wrapper">

        <table class="leaderboard-table">

          <thead>

            <tr>

              <th>Place</th>

              <th>Player</th>

              <th>Gross</th>

              <th>HCP</th>

              <th>Net</th>

              <th>Tee</th>

              <th>Date</th>

            </tr>

          </thead>

          <tbody>
    `;


    let previousNet = null;
    let previousGross = null;
    let place = 0;


    leaderboardRows.forEach(
      (row, index) => {

        // Competition-style placing:
        // identical net + gross = tie

        if (
          row.netScore !==
            previousNet ||
          row.grossScore !==
            previousGross
        ) {

          place = index + 1;

        }


        html += `

          <tr>

            <td class="position">
              ${place}
            </td>

            <td>
              ${escapeHtml(row.player)}
            </td>

            <td class="gross-score">
              ${row.grossScore}
            </td>

            <td class="course-handicap">
              ${row.courseHandicap}
            </td>

            <td class="net-score">
              ${row.netScore}
            </td>

            <td>
              ${escapeHtml(row.tee)}
            </td>

            <td>
              ${formatDate(row.date)}
            </td>

          </tr>

        `;


        previousNet =
          row.netScore;

        previousGross =
          row.grossScore;

      }
    );


    html += `

          </tbody>

        </table>

      </div>

    `;


    leaderboard.innerHTML =
      html;


  } catch (error) {

    console.error(
      "Could not load leaderboard:",
      error
    );


    leaderboard.innerHTML =
      `<p class="no-rounds">
        Could not load leaderboard.
        ${escapeHtml(error.message)}
      </p>`;

  }
}


// -------------------------
// FORMAT DATE
// -------------------------

function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(
      `${dateString}T12:00:00`
    );


  return date.toLocaleDateString(
    "en-US",
    {
      month: "numeric",
      day: "numeric",
      year: "numeric"
    }
  );
}


// -------------------------
// ESCAPE HTML
// -------------------------

function escapeHtml(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// -------------------------
// COURSE BUTTONS
// -------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const buttons =
      document.querySelectorAll(
        ".course-tab"
      );


    buttons.forEach(button => {

      button.addEventListener(
        "click",
        () => {

          // Remove active state
          buttons.forEach(
            otherButton => {

              otherButton.classList.remove(
                "active"
              );

            }
          );


          // Activate clicked button
          button.classList.add(
            "active"
          );


          // Load leaderboard
          loadRounds(
            button.dataset.courseId
          );

        }
      );

    });


    // Automatically load
    // Newton Commonwealth
    if (buttons.length > 0) {

      buttons[0].click();

    }

  }
);
