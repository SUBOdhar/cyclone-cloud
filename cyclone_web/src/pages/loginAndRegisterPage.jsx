import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import { MdCyclone } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { CircularProgress, InputAdornment } from "@mui/material";
import { useEffect } from "react";
import { Email, Lock } from "@mui/icons-material";
import { deleteCookie, getCookie, setCookie } from "../components/Cookies";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function SignIn() {
  // Controlled input states
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState("");

  // Validation state
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");

  const navigate = useNavigate();

  // Validate email on change
  const validateEmail = (value) => {
    if (!value || !/\S+@\S+\.\S+/.test(value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      return false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
      return true;
    }
  };

  useEffect(() => {
    if (getCookie("loginstat") === "true") {
      navigate("/files");
    }
  }, [navigate]);

  // Validate password on change
  const validatePassword = (value) => {
    if (!value || value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      return false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
      return true;
    }
  };

  // Validate all inputs on form submission
  const validateInputs = () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    return isEmailValid && isPasswordValid;
  };
  const url = import.meta.env.VITE_url || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${url}/api/login`, {
        method: "POST",
        credentials: "include", // send/receive cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: email,
          user_password: password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // On successful login, the server sets a secure cookie.
        setCookie("loginstat", "true", 7);
        setCookie("userid", data.user.user_id, 7);
        setCookie("username", data.user.user_name, 7);
        setCookie("useremail", data.user.user_email, 7);
        navigate("/files");
      } else {
        setLoginError(data.error || "Invalid email or password.");
        deleteCookie("userid");
        deleteCookie("username");
        deleteCookie("useremail");
        deleteCookie("loginstat");
      }
    } catch (error) {
      setLoginError("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <center>
            <MdCyclone size={50} color="darkblue" />
          </center>
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            Sign in
          </Typography>
          {loginError && (
            <Typography color="error" sx={{ textAlign: "center" }}>
              {loginError}
            </Typography>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            <TextField
              error={emailError}
              helperText={emailErrorMessage}
              type="email"
              label="Email"
              name="email"
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
              required
              fullWidth
              variant="outlined"
              color={emailError ? "error" : "primary"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateEmail(e.target.value);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              error={passwordError}
              helperText={passwordErrorMessage}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Your Password"
              required
              fullWidth
              variant="outlined"
              color={passwordError ? "error" : "primary"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePassword(e.target.value);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              style={{
                marginTop: 15,
                padding: 15,
                borderRadius: 10,
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign in"
              )}
            </Button>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
