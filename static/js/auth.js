// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");

        try {

            const response = await fetch("/api/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })

            });

            const data = await response.json();

            if (data.success) {

                message.textContent = "Login successful!";
                message.className = "message success";

                setTimeout(() => {
                    window.location.href = "/notes";
                }, 700);

            } else {

                message.textContent = data.message;
                message.className = "message error";

            }

        } catch (error) {

            message.textContent =
                "Unable to connect to server.";

            message.className = "message error";

            console.error(error);
        }

    });
}


// ==========================================
// REGISTER
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const username =
            document.getElementById("username").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("message");


        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.className =
                "message error";

            return;
        }


        try {

            const response = await fetch("/api/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })

            });


            const data = await response.json();


            if (data.success) {

                message.textContent =
                    "Account created successfully!";

                message.className =
                    "message success";


                setTimeout(() => {

                    window.location.href = "/login";

                }, 1000);


            } else {

                message.textContent =
                    data.message;

                message.className =
                    "message error";

            }

        } catch (error) {

            message.textContent =
                "Unable to connect to server.";

            message.className =
                "message error";

            console.error(error);

        }

    });
}
