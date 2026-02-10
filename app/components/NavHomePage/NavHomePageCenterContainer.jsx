import React, { useEffect, useState, useRef } from "react";
import {
  Col,
  Nav,
  NavItem,
  NavLink,
  Row,
  TabContent,
  TabPane,
} from "reactstrap";
import { AccountType, LOCAL_STORAGE_KEYS } from "../../common/constants";
import { authState } from "../auth/auth.slice";
import { useAppSelector, useAppDispatch } from "../../store";
import MyClips from "../locker/my-clips";
import Reports from "../locker/reports";
import BookingList from "../bookings/BookingList";
import { loadStripe } from "@stripe/stripe-js";
import { createStripeVarificationUrl, createVarificationSession } from "../common/common.api";
import Link from "next/link";
import Slider from "react-slick";
import { useMediaQuery } from "../../hook/useMediaQuery";
import OrientationModal from "../modalComponent/OrientationModal";
import Image from "next/image";

// class VerifyButton extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { submitted: false };
//     this.handleClick = this.handleClick.bind(this);
//   }

//   async componentDidMount() {
//     this.setState({ stripe: await this.props.stripePromise });
//   }

//   async handleClick(event) {
//     // Block native event handling.
//     event.preventDefault();

//     const { stripe } = this.state;

//     if (!stripe) {
//       // Stripe.js hasn't loaded yet. Make sure to disable
//       // the button until Stripe.js has loaded.
//       return;
//     }

//     // Call your backend to create the VerificationSession.
//     const session = await createVarificationSession();
//     // const session = await response.json();



//     const client_secret = session.data.result.clientSecret
//      
//     if (client_secret) {

//       // Show the verification modal.
//       const { error } = await stripe?.verifyIdentity(client_secret);

//       if (error) {
//          
//       } else {
//          
//         this.setState({ submitted: true });
//       }
//     }
//   };

//   render() {
//     const { stripe, submitted } = this.state;

//     if (submitted) {
//       return (
//         <>
//           <h1>Thanks for submitting your identity document</h1>
//           <p>
//             We are processing your verification.
//           </p>
//         </>
//       );
//     }

//     return (
//       <button
//         role="link"
//         disabled={!stripe}
//         onClick={this.handleClick}
//         style={{
//           borderRadius: "10px",
//           background: "#000080",
//           color: "white",
//           fontWeight: 600,
//           padding: "7px"
//         }}>
//         complete KYC
//       </button>
//     );
//   }
// }

// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

var settings = {
  autoplay: false,
  infinite: false,
  speed: 2000,
  slidesToShow: 1,
  slidesToScroll: 1,
  swipeToSlide: true,
  autoplaySpeed: 1000,
  arrows: true,

  responsive: [
    {
      breakpoint: 1366,
      settings: {
        autoplay: false,
        slidesToShow: 3,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 800,
      settings: {
        autoplay: false,
        slidesToShow: 2,
      },
    },
    {
      breakpoint: 768,
      settings: {
        autoplay: false,
        slidesToShow: 2,
      },
    },
    {
      breakpoint: 700,
      settings: {
        autoplay: false,
        slidesToShow: 1,
      },
    },
  ],
};


const allTabs = [
  {
    name: "My Clips",
    value: "myClips",
    accessBy: [AccountType?.TRAINEE, AccountType?.TRAINER],
    component: MyClips,
  },
  {
    name: "Saved Lessons & Game Plan",
    value: "gamePlans",
    accessBy: [AccountType?.TRAINER, AccountType?.TRAINEE],
    component: Reports,
  },
];

const NavHomePageCenterContainer = ({ onTabChange, selectedTraineeId, onClearTrainee }) => {
  const dispatch = useAppDispatch();
  const { accountType, userInfo } = useAppSelector(authState);
  const [activeTab, setActiveTab] = useState("myClips");
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  // Clear trainee selection when switching tabs away from myClips
  useEffect(() => {
    if (activeTab !== "myClips" && selectedTraineeId && onClearTrainee) {
      onClearTrainee();
    }
  }, [activeTab, selectedTraineeId, onClearTrainee]);

  const isMobile = useMediaQuery(599)


  const toggleTab = (tabValue) => {
    if (!isScrolling) {
      setActiveTab(tabValue);
      if (onTabChange) {
        onTabChange(tabValue);
      }
    }
  };

  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // Handle scroll events to prevent tab switching during scroll
  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to re-enable tab switching after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // 150ms delay after scroll ends
  };

  useEffect(() => {
    const tabContent = document.querySelector('.file-tab.Nav-Home');
    if (tabContent) {
      tabContent.addEventListener('scroll', handleScroll);
      
      return () => {
        tabContent.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [activeTab]);

  const handleKYCVarification = async (url) => {

    if (userInfo?.stripe_account_id) {
      const result = await createStripeVarificationUrl({ stripe_account_id: userInfo?.stripe_account_id })
      const stripe_url = result?.data?.result?.url ?? "";

      if (stripe_url) {
        window.open(stripe_url, "_blank");
      }
    }
  }

  const [modal, setModal] = useState(false);

  return (
    <>

      <div id="navHomePageCenterContainer">
        { (
          <>
            {(userInfo?.account_type === "Trainer" &&!userInfo?.is_kyc_completed )? (
              <div style={{
                padding: "5px",
                background: "red",
                marginBottom: "15px",
                borderRadius: "5px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span style={{ padding: "5px", color: "white" }}>
                  Please complete your KYC
                </span>
                <button
                  style={{
                    borderRadius: "10px",
                    background: "#000080",
                    color: "white",
                    fontWeight: 600,
                    padding: "7px"
                  }}
                  onClick={handleKYCVarification}
                >
                  Complete KYC
                </button>
              </div>
            ) : userInfo?.status === "pending" ? (
              <div style={{
                padding: "5px",
                background: "orange",
                marginBottom: "15px",
                borderRadius: "5px",
                textAlign: "center"
              }}>
                <span style={{ padding: "5px", color: "white" }}>
                  Please wait while the admin approves your request.
                </span>
              </div>
            ) : userInfo?.status === "rejected" ? (
              <div style={{
                padding: "5px",
                background: "darkred",
                marginBottom: "15px",
                borderRadius: "5px",
                textAlign: "center"
              }}>
                <span style={{ padding: "5px", color: "white" }}>
                  Your account has been rejected by the admin. Please contact customer support.
                </span>
              </div>
            ) : null}
          </>
        )}
        <div className="theme-tab sub-nav" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white',paddingBottom: "10px" }}>
          {!isMobile ? <Nav tabs>
            {allTabs?.map(
              (el) =>
                el?.accessBy?.includes(accountType) && (
                  <NavItem key={el.value}>
                    <NavLink
                      className={
                        activeTab === el?.value
                          ? "activelink sub-item"
                          : "sub-item"
                      }
                      onClick={() => toggleTab(el?.value)}
                    >
                      {/* {el?.name === "Schedule" ? (
                        <>&nbsp;&nbsp;Schedule &nbsp; </>
                      ) : (
                        el?.name
                      )} */}
                      {el?.name}
                    </NavLink>
                  </NavItem>
                )
            )}
          </Nav> : (
            <Nav tabs style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div className="theme-tab">
                <Nav tabs>
                  <div className="row mb-2">
                    <div className="col text-center" style={{ flexBasis: "auto" }}>
                      <NavItem className="ml-1 text-center">
                        <NavLink
                          className={`button-effect ${activeTab === "myClips" ? "activelink" : ""}`}
                          onClick={() => toggleTab("myClips")}
                          style={{ width: "100%" }}
                        >
                          My Clips
                        </NavLink>
                      </NavItem>
                    </div>
                    <div className="col text-center" style={{ flexBasis: "auto" }}>
                      <NavItem className="ml-1">
                        <NavLink
                          className={`button-effect ${activeTab === "gamePlans" ? "activelink" : ""}`}
                          onClick={() => toggleTab("gamePlans")}
                          style={{ width: "100%" }}
                        >
                          Saved Lessons & Game Plan
                        </NavLink>
                      </NavItem>
                    </div>
                  </div>
                </Nav>
              </div>
            </Nav>
          )}
        </div>
        <div className="file-tab Nav-Home" style={{ color: "black", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>


          <TabContent activeTab={activeTab}>
            {
              allTabs?.map((el, index) => {
                return (
                  <TabPane key={index} tabId={el?.value}>
                    {el?.component ? (
                      <el.component
                        key={index}
                        activeCenterContainerTab={activeTab}
                        trainee_id={el?.value === "myClips" ? selectedTraineeId : null}
                      />
                    ) : (
                      <h1>{el?.name}</h1>
                    )}
                  </TabPane>
                );
              })}
          </TabContent>
        </div>
      </div>
    </>
  );
};

export default NavHomePageCenterContainer;
