const backendURL = "https://cloudvault-backend-1-votf.onrender.com"; // 🔁 Replace with your actual Render backend URL

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  if (!container) {
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

// --- Register ---
const regForm = document.getElementById("regForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const submitBtn = regForm.querySelector(".btn-submit");

    setButtonLoading(submitBtn, true);
    try {
      const res = await fetch(`${backendURL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        showNotification(data.error || "Registration failed.", "error");
      }
    } catch (err) {
      console.error("Registration error:", err);
      showNotification(
        "Registration failed. Please check your network.",
        "error"
      );
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// --- Login ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const submitBtn = loginForm.querySelector(".btn-submit");

    setButtonLoading(submitBtn, true);
    try {
      const res = await fetch(`${backendURL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        showNotification("Login successful!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        showNotification(
          data.error || "Login failed. Invalid credentials.",
          "error"
        );
      }
    } catch (err) {
      console.error("Login error:", err);
      showNotification("Error logging in. Please check your network.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}
