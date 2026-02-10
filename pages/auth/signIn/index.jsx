import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle } from "react-feather";
import { googleOAuthLink, routingPaths } from "../../../app/common/constants";
import CircleLoader from "../../../app/common/CircleLoader";
import { useAppDispatch, useAppSelector } from "../../../app/store";
import {
  authAction,
  authState,
  googleLoginAsync,
  loginAsync,
} from "../../../app/components/auth/auth.slice";

const Auth_SignIn = ({isRedirect = true}) => {
  const dispatch = useAppDispatch();
  const { status } = useAppSelector(authState);
  const [credential, setCredential] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredential({ ...credential, [name]: value });
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage("");
    }
  };
  
  // simple  login
  const Login = async () => {
    // Validate inputs
    if (!credential.email || !credential.password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    
    // Clear previous errors
    setErrorMessage("");
    
    try {
      dispatch(authAction.updateIsRedirectToDashboard(isRedirect));
      await dispatch(loginAsync({
        email: credential.email.toLowerCase(),
        password: credential.password
      })).unwrap();
      // Success - user will be redirected by auth guard
    } catch (error) {
      // Error is already shown via toast in loginAsync
      // But we can also set a local error message for better UX
      if (error?.isNetworkError || !error?.response) {
        setErrorMessage("Unable to connect to the server. Please check your internet connection and ensure the server is running.");
      } else if (error?.response?.status === 401) {
        setErrorMessage("Invalid email or password. Please try again.");
      } else {
        setErrorMessage(error?.response?.data?.error || error?.response?.data?.message || "Login failed. Please try again.");
      }
    }
  };
  
  // Clear error message when status changes
  useEffect(() => {
    if (status === 'idle' || status === 'fulfilled') {
      setErrorMessage("");
    }
  }, [status]);
  // const redirectToSignUpPage = () => {
  //   router.push("/auth/signUp");
  // };

  // const login = useGoogleLogin({
  //   onSuccess: async (codeResponse) => {
  //     await axios
  //       .get(`${googleOAuthLink}${codeResponse.access_token}`)
  //       .then((res) => {
  //         dispatch(googleLoginAsync({ email: res.data.email }));
  //       })
  //       .catch((err) =>  );
  //   },
  //   onError: (error) => {
  //      
  //   },
  // });

  return (   
    <div className="login-page1">
      <style dangerouslySetInnerHTML={{__html: `
        .login-page1 .btn-primary {
          color: #ffffff !important;
        }
        .login-page1 .btn-primary span {
          color: #ffffff !important;
        }
      `}} />
      <div className="container-fluid p-0">
        <div className="row m-0">
          <div className="col-12 p-0">
            <div className="login-contain-main">
              <div className={isRedirect ? "left-page" : "complete-width"}>
                <div className="login-content">
                  <div className="login-content-header">
                    <Link href={routingPaths.landing}>
                      {/* <div className="chitchat-loader"> */}
                      <img
                        src="/assets/images/netquix_logo_beta.png"
                        alt="images"
                        className="image-fluid header-image-logo"
                      />
                  {/* </div> */}
                    </Link>
                  </div>
                  {/* <h3>Hello Everyone , We are Chitchat</h3>
                  <h4>Welcome to chitchat please login to your account.</h4> */}
                  <h3 className="header-text">Welcome</h3>
                  <h4>Please login to your account.</h4>
                  <form className="form1">
                    <div className="form-group">
                      <label className="col-form-label" htmlFor="inputEmail3">
                        Email Address
                      </label>
                      <input
                        className="form-control"
                        id="inputEmail3"
                        value={credential.email}
                        onChange={(e) => handleChange(e)}
                        name="email"
                        type="email"
                        placeholder="Enter email"
                        style={{ placeholder: "red" }}
                      />
                    </div>
                    <div className="form-group">
                      <label
                        className="col-form-label"
                        htmlFor="inputPassword3"
                      >
                        Password
                      </label>
                      <span> </span>
                      <div style={{ position: "relative" }}>
                        <input
                          className="form-control"
                          id="inputPassword3"
                          value={credential.password}
                          onChange={(e) => handleChange(e)}
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          style={{ paddingRight: "40px" }}
                        />
                        <span
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            cursor: "pointer",
                            color: "#6c757d",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="rememberchk">
                        <div className="input-text form-check pl-0">
                          <input
                            type="checkbox"
                            id="gridCheck1"
                            aria-label="Checkbox for following text input"
                          />
                          <label
                            className="form-check-label ml-2 mr-auto"
                            htmlFor="gridCheck1"
                          >
                            Remember Me.
                          </label>
                          <h6
                            className="pointer"
                            onClick={() => {
                              router.push(routingPaths.forgetPassword);
                            }}
                          >
                            Forgot Password?
                          </h6>
                        </div>
                      </div>
                    </div>
                    {/* Error Message Display */}
                    {errorMessage && (
                      <div className="form-group" style={{ marginBottom: "15px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 16px",
                            backgroundColor: "#fee",
                            border: "1px solid #fcc",
                            borderRadius: "4px",
                            color: "#c33",
                            fontSize: "14px",
                          }}
                        >
                          <AlertCircle size={18} />
                          <span>{errorMessage}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <div
                        className="buttons"
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          width: "100%",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-primary button-effect"
                          onClick={Login}
                          disabled={status === "loading"}
                          style={{
                            width: "100%",
                            maxWidth: "400px",
                            padding: "12px 24px",
                            fontSize: "16px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            opacity: status === "loading" ? 0.8 : 1,
                            cursor:
                              status === "loading" ? "not-allowed" : "pointer",
                            color: "#ffffff",
                          }}
                        >
                          {status === "loading" && <CircleLoader size={22} />}
                          <span>
                            {status === "loading" ? "Logging in..." : "Login"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </form>
                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        width: "100%",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ color: "#555" }}>
                        Don&apos;t have an account?{" "}
                      <Link
                        href={routingPaths.signUp}
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#000080",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                      >
                          Sign up
                      </Link>
                      </span>
                    </div>
                  </div>
                  <div className="line">
                    <h6>OR Connect with</h6>
                  </div>
                  <div className="medialogo">
                    <ul>
                      <li>
                        <div
                          onClick={() => login()}
                          className="icon-btn btn-danger button-effect"
                          href="https://www.google.com/"
                        >
                          <i className="fa fa-google"></i>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="termscondition">
                  <h4 className="mb-0">
                    <a href="/t&c"><span>*</span>Terms and conditions<b>&amp;</b></a>
                    <a href="/privacy-policy">Privacy policy</a>
                    </h4>
                  </div>
                </div>
              </div>
              {/* <div className="right-page">
                <div className="right-login animat-rate">
                  <div className="animation-block">
                    <div className="bg_circle">
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <div className="cross"></div>
                    <div className="cross1"></div>
                    <div className="cross2"></div>
                    <div className="dot"></div>
                    <div className="dot1"></div>
                    <div className="maincircle"></div>
                    <div className="top-circle"></div>
                    <div className="center-circle"></div>
                    <div className="bottom-circle"></div>
                    <div className="bottom-circle1"></div>
                    <div className="right-circle"></div>
                    <div className="right-circle1"></div>
                    <img
                      className="heart-logo"
                      src="/assets/images/login_signup/5.png"
                      alt="login logo"
                    />
                    <img
                      className="has-logo"
                      src="/assets/images/login_signup/4.png"
                      alt="login logo"
                    />
                    <img
                      className="login-img"
                      src="/assets/images/login_signup/1.png"
                      alt="login logo"
                    />
                    <img
                      className="boy-logo"
                      src="/assets/images/login_signup/6.png"
                      alt="login boy logo"
                    />
                    <img
                      className="girl-logo"
                      src="/assets/images/login_signup/7.png"
                      alt="girllogo"
                    />
                    <img
                      className="cloud-logo"
                      src="/assets/images/login_signup/2.png"
                      alt="login logo"
                    />
                    <img
                      className="cloud-logo1"
                      src="/assets/images/login_signup/2.png"
                      alt="login logo"
                    />
                    <img
                      className="cloud-logo2"
                      src="/assets/images/login_signup/2.png"
                      alt="login logo"
                    />
                    <img
                      className="cloud-logo3"
                      src="/assets/images/login_signup/2.png"
                      alt="login logo"
                    />
                    <img
                      className="cloud-logo4"
                      src="/assets/images/login_signup/2.png"
                      alt="login logo"
                    />
                    <img
                      className="has-logo1"
                      src="/assets/images/login_signup/4.png"
                      alt="login logo"
                    />
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    
  );
};

export default Auth_SignIn;