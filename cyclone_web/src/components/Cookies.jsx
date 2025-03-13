// Set a cookie with name, value, and expiration days
function setCookie(cookieName, cookieValue, expireDays) {
  const d = new Date();
  d.setTime(d.getTime() + expireDays * 24 * 60 * 60 * 1000);
  let expires = "expires=" + d.toUTCString();
  document.cookie = `${cookieName}=${encodeURIComponent(
    cookieValue
  )};${expires};path=/;SameSite=Lax`;
}

// Get a cookie by name
function getCookie(cookieName) {
  let name = cookieName + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// Delete a cookie by setting its expiration to the past
function deleteCookie(cookieName) {
  document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

// Check if a cookie exists
function checkCookie(cookieName) {
  return getCookie(cookieName) !== "";
}
export { getCookie, setCookie, deleteCookie, checkCookie };
