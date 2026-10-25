const sendMessageButton = document.getElementById("sendMessageButton");

sendMessageButton.addEventListener("click", () => {
  const name = document.getElementById("cName").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  const message = document.getElementById("cMsg").value.trim();

  if (!name || !email || !message) {
    alert("Please fill in your name, email, and message.");
    return;
  }

  const successMessage = document.getElementById("successMsg");
  successMessage.style.display = "block";
  ["cName", "cEmail", "cSubject", "cMsg"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  setTimeout(() => {
    successMessage.style.display = "none";
  }, 5000);
});
