const backendURL = "https://your-backend-url.onrender.com"; // 🔁 Replace with your actual Render backend URL
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html"; // Redirect to login if no token
}

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  if (!container) {
    console.warn("Notification container not found, falling back to alert.");
    alert(message); // Fallback if container not found
    return;
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    notification.addEventListener("transitionend", () => notification.remove());
  }, 3000);
}

function setButtonLoading(button, isLoading) {
  const spinner = button.querySelector(".spinner");
  const textSpan = button.querySelector("span");
  if (spinner && textSpan) {
    if (isLoading) {
      spinner.classList.remove("hidden");
      textSpan.style.visibility = "hidden";
      button.disabled = true;
    } else {
      spinner.classList.add("hidden");
      textSpan.style.visibility = "visible";
      button.disabled = false;
    }
  }
}

// --- Decode JWT to get user info for greeting ---
function getUserRoleFromToken(jwtToken) {
  try {
    const base64Url = jwtToken.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload).role;
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
}

// --- Initialize user greeting and logout ---
const userRole = getUserRoleFromToken(token);
const userGreetingElement = document.getElementById("userGreeting");
if (userGreetingElement && userRole) {
  userGreetingElement.textContent = `Hello, ${
    userRole.charAt(0).toUpperCase() + userRole.slice(1)
  }!`;
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
}

// --- Chart setup ---
let bpChart, sugarChart, hrChart;

function createChart(ctx, data, label, borderColor, backgroundColor) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: label,
          data: data.map((d) => d.value),
          borderColor: borderColor,
          backgroundColor: backgroundColor,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(0,0,0,0.05)",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.raw}`;
            },
          },
        },
      },
    },
  });
}

// --- Fetch and Display Records ---
async function fetchVitalsAndFiles() {
  const recordsListDiv = document.getElementById("recordsList");
  const filesListDiv = document.getElementById("filesList");

  if (recordsListDiv)
    recordsListDiv.innerHTML = '<p class="loading-text">Loading vitals...</p>';
  if (filesListDiv)
    filesListDiv.innerHTML = '<p class="loading-text">Loading files...</p>';

  try {
    const [resVitals, resFiles] = await Promise.all([
      fetch(`${backendURL}/api/records/my`, {
        headers: { Authorization: token },
      }),
      fetch(`${backendURL}/api/files/my`, {
        headers: { Authorization: token },
      }),
    ]);

    const vitals = await resVitals.json();
    const files = await resFiles.json();

    // Display Vitals
    if (recordsListDiv) {
      recordsListDiv.innerHTML = ""; // Clear loading text
      if (vitals.length === 0) {
        recordsListDiv.innerHTML = "<p>No vital records found.</p>";
      } else {
        vitals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by date desc
        vitals.forEach((v) => {
          const recordItem = document.createElement("div");
          recordItem.className = "record-item";
          recordItem.innerHTML = `
            <span><strong>BP:</strong> ${v.bp}</span>
            <span><strong>Sugar:</strong> ${v.sugar}</span>
            <span><strong>HR:</strong> ${v.heartRate}</span>
            <span class="record-date">${new Date(
              v.createdAt
            ).toLocaleString()}</span>
          `;
          recordsListDiv.appendChild(recordItem);
        });

        // Prepare data for charts
        // For BP, taking the systolic (first) value for simplicity in graphing
        const bpData = vitals.map((v) => ({
          date: v.createdAt,
          value: parseFloat(v.bp.split("/")[0]),
        }));
        const sugarData = vitals.map((v) => ({
          date: v.createdAt,
          value: parseFloat(v.sugar),
        }));
        const hrData = vitals.map((v) => ({
          date: v.createdAt,
          value: parseFloat(v.heartRate),
        }));

        // Destroy existing charts if they exist
        if (bpChart) bpChart.destroy();
        if (sugarChart) sugarChart.destroy();
        if (hrChart) hrChart.destroy();

        // Render charts
        if (document.getElementById("bpChart")) {
          bpChart = createChart(
            document.getElementById("bpChart").getContext("2d"),
            bpData,
            "Blood Pressure (Systolic)",
            "rgba(75, 192, 192, 1)",
            "rgba(75, 192, 192, 0.2)"
          );
        }
        if (document.getElementById("sugarChart")) {
          sugarChart = createChart(
            document.getElementById("sugarChart").getContext("2d"),
            sugarData,
            "Sugar Level",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 99, 132, 0.2)"
          );
        }
        if (document.getElementById("hrChart")) {
          hrChart = createChart(
            document.getElementById("hrChart").getContext("2d"),
            hrData,
            "Heart Rate",
            "rgba(54, 162, 235, 1)",
            "rgba(54, 162, 235, 0.2)"
          );
        }
      }
    }

    // Display Files
    if (filesListDiv) {
      filesListDiv.innerHTML = ""; // Clear loading text
      if (files.length === 0) {
        filesListDiv.innerHTML = "<p>No files uploaded yet.</p>";
      } else {
        files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by date desc
        files.forEach((f) => {
          const fileItem = document.createElement("div");
          fileItem.className = "file-item";
          fileItem.innerHTML = `
            <a href="${
              f.fileUrl
            }" target="_blank" rel="noopener noreferrer" class="file-link">
                <span class="file-icon">📄</span> ${f.fileName}
            </a>
            <span class="file-date">${new Date(
              f.createdAt
            ).toLocaleString()}</span>
          `;
          filesListDiv.appendChild(fileItem);
        });
      }
    }
  } catch (err) {
    console.error("Error loading data:", err);
    showNotification("Error loading data. Please try again.", "error");
    if (recordsListDiv)
      recordsListDiv.innerHTML =
        '<p class="error-text">Failed to load vital records.</p>';
    if (filesListDiv)
      filesListDiv.innerHTML =
        '<p class="error-text">Failed to load files.</p>';
  }
}

fetchVitalsAndFiles();

// --- Add Vitals ---
document.getElementById("vitalsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bp = document.getElementById("bp").value;
  const sugar = document.getElementById("sugar").value;
  const heartRate = document.getElementById("hr").value;
  const submitBtn = e.submitter; // Get the button that triggered the submit

  setButtonLoading(submitBtn, true);

  try {
    const res = await fetch(`${backendURL}/api/records/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ bp, sugar, heartRate }),
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || "Vitals added successfully!", "success");
      e.target.reset(); // Clear form
      await fetchVitalsAndFiles(); // Refresh data
    } else {
      showNotification(data.error || "Failed to add vitals.", "error");
    }
  } catch (err) {
    console.error("Add vitals error:", err);
    showNotification(
      "Failed to submit vitals. Please check your input.",
      "error"
    );
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// --- Upload File ---
document.getElementById("fileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData();
  const fileInput = document.getElementById("file");
  const submitBtn = e.submitter;

  if (!fileInput.files[0]) {
    showNotification("Please select a file to upload.", "warning");
    return;
  }

  fd.append("file", fileInput.files[0]);
  setButtonLoading(submitBtn, true);

  try {
    const res = await fetch(`${backendURL}/api/files/upload`, {
      method: "POST",
      headers: { Authorization: token },
      body: fd,
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(
        data.message || "File uploaded successfully!",
        "success"
      );
      e.target.reset(); // Clear form
      await fetchVitalsAndFiles(); // Refresh data
    } else {
      showNotification(data.error || "Failed to upload file.", "error");
    }
  } catch (err) {
    console.error("Upload file error:", err);
    showNotification("Failed to upload file. Please try again.", "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
});
