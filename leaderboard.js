const SUPABASE_URL = "https://edhnlhbmmztvflpjhwga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaG5saGJtbXp0dmZscGpod2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTc2MzAsImV4cCI6MjEwNTQzMzYzMH0.53CN7eiQ1q8-3KKQg6P0ckieVdKh-gQP4uiwn0ukSks";

// --------------------------------
// SUPABASE REQUEST
// --------------------------------

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


// --------------------------------
// GET COURSE
// --------------------------------

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


// --------------------------------
// LOAD LEADERBOARD
// --------------------------------

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

    // --------------------------------
    // COURSE
    // --------------------------------

    const course =
      await getCourse(courseId);


    // --------------------------------
    // HOLES
    // --------------------------------

    const holes =
      await supabaseRequest(
        "holes",
        `?course_id=eq.${courseId}&select=id,hole_number,par&order=hole_number`
      );


    if (holes.length !== 18) {

      throw new Error(
        "Could not find all 18 holes for this course."
      );

    }


    // Create hole lookup
    const holeMap = {};


    holes.forEach(hole => {

      holeMap[hole.id] = hole;

    });


    // --------------------------------
    // ROUNDS
    // --------------------------------

    const rounds =
      await supabaseRequest(
        "rounds",
        `?course_id=eq.${courseId}&select=id,player_id,tee_id,handicap,played_at&order=played_at.asc,id.asc`
      );


    // --------------------------------
    // HEADER
    // --------------------------------

    header.innerHTML = `
      <h2 class="leaderboard-title">
        ${escapeHtml(course.name)}
      </h2>

      <p class="leaderboard-subtitle">
        Par ${course.par} — Net Leaderboard
      </p>
    `;


    // --------------------------------
    // NO ROUNDS
    // --------------------------------

    if (rounds.length === 0) {

      leaderboard.innerHTML =
        `<p class="no-rounds">
          No rounds have been submitted for this course yet.
        </p>`;

      return;
    }


    // --------------------------------
    // PLAYERS
    // --------------------------------

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


    // --------------------------------
    // TEES
    // --------------------------------

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


    // --------------------------------
    // SCORES
    // --------------------------------

    const roundIds =
      rounds.map(
        round => round.id
      );


    const scores =
      await supabaseRequest(
        "scores",
        `?round_id=in.(${roundIds.join(",")})&select=round_id,hole_id,strokes`
      );


    // --------------------------------
    // GROUP SCORES BY ROUND
    // --------------------------------

    const scoresByRound = {};


    scores.forEach(score => {

      if (
        !scoresByRound[score.round_id]
      ) {

        scoresByRound[score.round_id] = {};

      }


      scoresByRound[score.round_id][
        score.hole_id
      ] =
        Number(score.strokes);

    });


    // --------------------------------
    // BUILD LEADERBOARD ROWS
    // --------------------------------

    const leaderboardRows =
      rounds.map(round => {

        const tee =
          teeMap[round.tee_id];


        if (!tee) {

          throw new Error(
            `Tee not found for round ${round.id}.`
          );

        }


        const roundScores =
          scoresByRound[round.id] || {};


        // --------------------------------
        // HOLE SCORES
        // --------------------------------

        const holeScores = {};


        holes.forEach(hole => {

          holeScores[hole.hole_number] =
            roundScores[hole.id] ?? null;

        });


        // --------------------------------
        // FRONT 9
        // --------------------------------

        let frontNine = 0;

        for (
          let holeNumber = 1;
          holeNumber <= 9;
          holeNumber++
        ) {

          const score =
            holeScores[holeNumber];

          if (score !== null) {
            frontNine += score;
          }

        }


        // --------------------------------
        // BACK 9
        // --------------------------------

        let backNine = 0;

        for (
          let holeNumber = 10;
          holeNumber <= 18;
          holeNumber++
        ) {

          const score =
            holeScores[holeNumber];

          if (score !== null) {
            backNine += score;
          }

        }


        // --------------------------------
        // GROSS
        // --------------------------------

        const grossScore =
          frontNine +
          backNine;


        // --------------------------------
        // HANDICAP
        // --------------------------------

        const handicapIndex =
          Number(round.handicap);


        const courseRating =
          Number(tee.course_rating);


        const slope =
          Number(tee.slope);


        const par =
          Number(course.par);


        // --------------------------------
        // WHS COURSE HANDICAP
        // --------------------------------

        const courseHandicap =
          handicapIndex *
            (slope / 113) +
          (courseRating - par);


        // --------------------------------
        // PLAYING HANDICAP
        // --------------------------------

        const playingHandicap =
          Math.floor(
            courseHandicap + 0.5
          );


        // --------------------------------
        // NET
        // --------------------------------

        const netScore =
          grossScore -
          playingHandicap;


        return {

          roundId:
            round.id,

          player:
            playerMap[round.player_id] ||
            "Unknown Player",

          date:
            round.played_at,

          handicap:
            handicapIndex,

          holeScores,

          frontNine,

          backNine,

          grossScore,

          courseHandicap:
            playingHandicap,

          netScore,

          tee:
            tee.name

        };

      });


    // --------------------------------
    // DEFAULT SORT
    // --------------------------------

    let currentSort = {
      key: "netScore",
      direction: "asc"
    };


    // --------------------------------
    // RENDER FUNCTION
    // --------------------------------

    function renderLeaderboard() {

      // Sort rows
      leaderboardRows.sort(
        (a, b) => {

          const aValue =
            getSortValue(
              a,
              currentSort.key
            );


          const bValue =
            getSortValue(
              b,
              currentSort.key
            );


          if (
            typeof aValue === "number" &&
            typeof bValue === "number"
          ) {

            if (
              aValue !==
              bValue
            ) {

              return currentSort.direction === "asc"
                ? aValue - bValue
                : bValue - aValue;

            }

          } else {

            const aString =
              String(aValue);

            const bString =
              String(bValue);


            if (
              aString !==
              bString
            ) {

              const comparison =
                aString.localeCompare(
                  bString
                );

              return currentSort.direction === "asc"
                ? comparison
                : -comparison;

            }

          }


          // --------------------------------
          // SECONDARY SORT
          // --------------------------------

          // When sorting by Net,
          // lower gross breaks the tie.

          if (
            currentSort.key ===
            "netScore"
          ) {

            if (
              a.grossScore !==
              b.grossScore
            ) {

              return (
                a.grossScore -
                b.grossScore
              );

            }

          }


          // Final tie-breaker:
          // earlier date first.

          return (
            new Date(a.date) -
            new Date(b.date)
          );

        }
      );


      // --------------------------------
      // BUILD TABLE
      // --------------------------------

      let html = `

        <div class="leaderboard-table-wrapper">

          <table class="leaderboard-table">

            <thead>

              <tr>

                ${sortableHeader(
                  "#",
                  "place",
                  false
                )}

                ${sortableHeader(
                  "Player",
                  "player",
                  true
                )}

                ${sortableHeader(
                  "Date",
                  "date",
                  true
                )}

                ${sortableHeader(
                  "HCP",
                  "handicap",
                  true
                )}

                ${holeHeaders(
                  1,
                  9
                )}

                ${sortableHeader(
                  "F9",
                  "frontNine",
                  true,
                  "front-total"
                )}

                ${holeHeaders(
                  10,
                  18
                )}

                ${sortableHeader(
                  "B9",
                  "backNine",
                  true,
                  "back-total"
                )}

                ${sortableHeader(
                  "Gross",
                  "grossScore",
                  true,
                  "gross-score"
                )}

                ${sortableHeader(
                  "Net",
                  "netScore",
                  true,
                  "net-score"
                )}

              </tr>

            </thead>


            <tbody>
      `;


      let previousNet =
        null;

      let previousGross =
        null;

      let place =
        0;


      leaderboardRows.forEach(
        (row, index) => {

          // --------------------------------
          // PLACE
          // --------------------------------

          if (
            row.netScore !==
              previousNet ||
            row.grossScore !==
              previousGross
          ) {

            place =
              index + 1;

          }


          html += `

            <tr>

              <td class="position">
                ${place}
              </td>

              <td class="player-cell">
                ${escapeHtml(row.player)}
              </td>

              <td class="date-cell">
                ${formatDate(row.date)}
              </td>

              <td class="handicap-cell">
                ${formatHandicap(row.handicap)}
              </td>

          `;


          // --------------------------------
          // HOLES 1-9
          // --------------------------------

          for (
            let holeNumber = 1;
            holeNumber <= 9;
            holeNumber++
          ) {

            html +=
              renderHoleCell(
                row,
                holeNumber,
                holeMap
              );

          }


          // --------------------------------
          // FRONT 9
          // --------------------------------

          html += `

              <td class="front-total">
                ${row.frontNine}
              </td>

          `;


          // --------------------------------
          // HOLES 10-18
          // --------------------------------

          for (
            let holeNumber = 10;
            holeNumber <= 18;
            holeNumber++
          ) {

            html +=
              renderHoleCell(
                row,
                holeNumber,
                holeMap
              );

          }


          // --------------------------------
          // BACK 9
          // --------------------------------

          html += `

              <td class="back-total">
                ${row.backNine}
              </td>


              <td class="gross-score">
                ${row.grossScore}
              </td>


              <td class="net-score">
                ${row.netScore}
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


      // --------------------------------
      // SORT BUTTONS
      // --------------------------------

      document
        .querySelectorAll(
          ".sortable"
        )
        .forEach(header => {

          header.addEventListener(
            "click",
            () => {

              const key =
                header.dataset.sort;


              if (
                currentSort.key ===
                key
              ) {

                currentSort.direction =
                  currentSort.direction === "asc"
                    ? "desc"
                    : "asc";

              } else {

                currentSort.key =
                  key;

                currentSort.direction =
                  "asc";

              }


              renderLeaderboard();

            }
          );

        });

    }


    // Initial render
    renderLeaderboard();

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


// --------------------------------
// GET SORT VALUE
// --------------------------------

function getSortValue(
  row,
  key
) {

  if (
    key === "date"
  ) {

    return new Date(
      row.date
    ).getTime();

  }


  if (
    key === "player"
  ) {

    return row.player
      .toLowerCase();

  }


  if (
    key === "place"
  ) {

    return 0;

  }


  if (
    key.startsWith("hole")
  ) {

    const holeNumber =
      Number(
        key.replace(
          "hole",
          ""
        )
      );


    return (
      row.holeScores[
        holeNumber
      ] ?? 999
    );

  }


  return row[key];

}


// --------------------------------
// SORTABLE HEADER
// --------------------------------

function sortableHeader(
  label,
  key,
  sortable = true,
  extraClass = ""
) {

  if (!sortable) {

    return `
      <th
        class="${extraClass}"
      >
        ${label}
      </th>
    `;

  }


  const arrow =
    getCurrentArrow(key);


  return `

    <th
      class="sortable ${extraClass}"
      data-sort="${key}"
    >
      ${label}
      <span class="sort-arrow">
        ${arrow}
      </span>
    </th>

  `;

}


// --------------------------------
// HOLE HEADERS
// --------------------------------

function holeHeaders(
  start,
  end
) {

  let html = "";


  for (
    let holeNumber = start;
    holeNumber <= end;
    holeNumber++
  ) {

    html += `

      <th
        class="sortable"
        data-sort="hole${holeNumber}"
      >

        ${holeNumber}

      </th>

    `;

  }


  return html;

}


// --------------------------------
// CURRENT SORT ARROW
// --------------------------------

function getCurrentArrow(key) {

  // The render function is recreated
  // whenever sorting occurs, so we
  // inspect the global state indirectly.

  if (
    window.currentSortKey === key
  ) {

    return window.currentSortDirection === "asc"
      ? "▲"
      : "▼";

  }


  return "↕";

}


// --------------------------------
// RENDER HOLE CELL
// --------------------------------

function renderHoleCell(
  row,
  holeNumber,
  holeMap
) {

  const score =
    row.holeScores[
      holeNumber
    ];


  const hole =
    Object.values(
      holeMap
    ).find(
      item =>
        Number(item.hole_number) ===
        holeNumber
    );


  if (
    score === null ||
    score === undefined
  ) {

    return `
      <td class="hole-score">
        -
      </td>
    `;

  }


  const par =
    Number(hole.par);


  const difference =
    Number(score) -
    par;


  let className =
    "score-symbol";


  // --------------------------------
  // EAGLE OR BETTER
  // --------------------------------

  if (
    difference <= -2
  ) {

    className +=
      " score-eagle";

  }


  // --------------------------------
  // BIRDIE
  // --------------------------------

  else if (
    difference === -1
  ) {

    className +=
      " score-birdie";

  }


  // --------------------------------
  // PAR
  // --------------------------------

  else if (
    difference === 0
  ) {

    // Normal number

  }


  // --------------------------------
  // BOGEY
  // --------------------------------

  else if (
    difference === 1
  ) {

    className +=
      " score-bogey";

  }


  // --------------------------------
  // DOUBLE BOGEY
  // --------------------------------

  else if (
    difference === 2
  ) {

    className +=
      " score-double-bogey";

  }


  // --------------------------------
  // TRIPLE BOGEY OR WORSE
  // --------------------------------

  else {

    className +=
      " score-triple-bogey";

  }


  return `

    <td class="hole-score">

      <span class="${className}">
        ${score}
      </span>

    </td>

  `;

}


// --------------------------------
// FORMAT HANDICAP
// --------------------------------

function formatHandicap(
  handicap
) {

  if (
    handicap === null ||
    handicap === undefined ||
    isNaN(handicap)
  ) {

    return "-";

  }


  const number =
    Number(handicap);


  if (
    Number.isInteger(number)
  ) {

    return number;

  }


  return number.toFixed(1);

}


// --------------------------------
// FORMAT DATE
// --------------------------------

function formatDate(
  dateString
) {

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


// --------------------------------
// ESCAPE HTML
// --------------------------------

function escapeHtml(
  value
) {

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


// --------------------------------
// COURSE BUTTONS
// --------------------------------

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


    // --------------------------------
    // LOAD NEWTON BY DEFAULT
    // --------------------------------

    if (
      buttons.length > 0
    ) {

      buttons[0].click();

    }

  }
);

  }
);
