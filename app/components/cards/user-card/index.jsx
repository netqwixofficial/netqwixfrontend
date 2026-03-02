import React, { useState, useEffect } from "react";
import { Utils } from "../../../../utils/utils";
import { useAppDispatch, useAppSelector } from "../../../store";
import { authState, authAction, getMeAsync } from "../../auth/auth.slice";
import { Edit, Save, Star, X, CheckSquare } from "react-feather";
import { AccountType, TRAINER_AMOUNT_USD } from "../../../common/constants";
import SocialMediaIcons from "../../../common/socialMediaIcons";
import { myClips } from "../../../../containers/rightSidebar/fileSection.api";
import { toast, ToastContainer } from "react-toastify";
import {
  getTraineeWithSlotsAsync,
  traineeState,
  updateTraineeProfileAsync,
} from "../../trainee/trainee.slice";
import { useMediaQuery } from "../../../hook/useMediaQuery";
import { updateProfileAsync } from "../../trainer/trainer.slice";

const UserInfoCard = () => {
  const { userInfo, accountType } = useAppSelector(authState);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedImage, setDisplayedImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dispatch = useAppDispatch();
  const width1200 = useMediaQuery(1200);
  const width2000 = useMediaQuery(2000);
  const width600 = useMediaQuery(600);
  const [profile, setProfile] = useState({
    username: "",
    address: "Alabma , USA",
    wallet_amount: 0,
    hourly_rate: 0,
    editStatus: false,
    profile_picture: undefined,
  });
  const { getTraineeSlots } = useAppSelector(traineeState);
  const [trainerRatings, setTrainerRatings] = useState([]);

  useEffect(() => {
    dispatch(getMeAsync());
  }, [dispatch]);

  useEffect(() => {
    if (userInfo && Object.keys(userInfo).length > 0) {
      setProfile((prev) => ({ ...prev, ...userInfo }));
      setDisplayedImage(userInfo?.profile_picture);
      setImageLoaded(false);
    }
  }, [userInfo]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = (e) => {
    setIsEditing(false);
    dispatch(updateProfileAsync({extraInfo:profile.extraInfo}));
  };

  const handleRateChange = (e) => {
    setProfile({
      ...profile,
      extraInfo: {
        ...profile?.extraInfo,
        hourly_rate: e.target.value,
      },
    });
  };

  const showRatings = (ratings, extraClasses = "") => {
    const { ratingRatio, totalRating } = Utils.getRatings(ratings);
    return (
      <>
        <div className={extraClasses} style={{
          gap: width600 ? "6px" : "8px",
          marginTop: width600 ? "4px" : "6px"
        }}>
          <Star color="#FFC436" size={width600 ? 24 : 28} style={{ flexShrink: 0 }} />
          <p style={{ 
            margin: 0, 
            fontWeight: "600", 
            color: "#333",
            fontSize: width600 ? "14px" : "16px"
          }}>
            {ratingRatio || 0}
          </p>
          <p style={{ 
            margin: 0, 
            fontWeight: "500", 
            color: "#666",
            fontSize: width600 ? "12px" : "14px"
          }}>
            ({totalRating || 0})
          </p>
        </div>
      </>
    );
  };

  useEffect(() => {
    const findByTrainerId = getTraineeSlots.find(
      (trainer) => trainer && trainer?._id === profile?._id
    );
    setTrainerRatings(findByTrainerId?.trainer_ratings);
  }, [getTraineeSlots]);

  useEffect(() => {
    // Prefetch trainer slots once per trainer (by id), not on every re-render
    if (!profile || !profile._id || !profile.fullname) return;

    const now = new Date();
    const filterPayload = {
      time: now.getTime(),
      day: now.getDay(),
      search: profile.fullname,
    };

    dispatch(getTraineeWithSlotsAsync(filterPayload));
  }, [dispatch, profile?._id, profile?.fullname]);


  return (
    <>
      {/* <ToastContainer /> */}
      <div className={`Trainer-box-1 card-body`} style={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: width600 ? "column" : "row",
        alignItems: width600 ? "center" : "flex-start",
        gap: width600 ? "15px" : "18px",
        padding: "10px 10px 10px 10px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e0e0e0",
        transition: "all 0.3s ease",
        margin: 0
      }}>
        {/* Square Image */}
        <div
          className="profile-picture-container"
          style={{
            position: "relative",
            width: width600 ? "100px" : width1200 ? "120px" : "140px",
            height: width600 ? "100px" : width1200 ? "120px" : "140px",
            borderRadius: "8px",
            border: width600 ? "3px solid #000080" : "4px solid #000080",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "#fff",
            boxShadow: "0 4px 12px rgba(0, 0, 128, 0.2)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 128, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 128, 0.2)";
          }}
        >
          {!imageLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#e8e8e8",
                borderRadius: "4px"
              }}
            />
          )}
          <img
            src={displayedImage?.startsWith("blob:")
              ? displayedImage
              : Utils.getImageUrlOfS3(displayedImage) || "/assets/images/demoUser.png"}
            alt="profile_image"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: "4px",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.2s ease"
            }}
            onError={(e) => {
              e.target.src = "/assets/images/demoUser.png";
              setImageLoaded(true);
            }}
          />
        </div>

        {/* Name and Pricing Section - Right side of image */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column",
          width: "100%",
          gap: width600 ? "8px" : "10px"
        }}>
          <h4 style={{ 
            margin: 0,
            fontWeight: "700", 
            color: "#1a1a1a",
            fontSize: width600 ? "16px" : width1200 ? "18px" : "22px",
            letterSpacing: "0.3px",
            textAlign: width600 ? "center" : "left"
          }}>
            {profile?.fullname || userInfo?.fullname || "User"}
          </h4>
          
          {accountType === AccountType?.TRAINER && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: width600 ? "center" : "flex-start",
              gap: width600 ? "8px" : "10px",
              flexWrap: "wrap"
            }}>
              <h5 style={{ 
                margin: 0, 
                fontWeight: "600", 
                color: "#555",
                fontSize: width600 ? "13px" : width1200 ? "14px" : "16px"
              }}>
                Hourly Rate: $
                {isEditing ? (
                  <input
                    type="number"
                    value={profile?.extraInfo?.hourly_rate || 0}
                    onChange={handleRateChange}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#000080";
                      e.target.style.boxShadow = "none";
                      handleSaveClick(e);
                    }}
                    style={{
                      width: width600 ? "70px" : "85px",
                      padding: width600 ? "4px 8px" : "5px 10px",
                      border: "2px solid #000080",
                      borderRadius: "6px",
                      fontSize: width600 ? "13px" : "15px",
                      marginLeft: "6px",
                      fontWeight: "600",
                      outline: "none",
                      transition: "all 0.3s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0056b3";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0, 0, 128, 0.1)";
                    }}
                  />
                ) : (
                  <span style={{ color: "#000080", fontWeight: "700", fontSize: width600 ? "15px" : "17px" }}>
                    {profile?.extraInfo?.hourly_rate || 0}
                  </span>
                )}
              </h5>
              <button
                className="icon-btn btn-outline-primary btn-sm"
                type="button"
                onClick={isEditing ? handleSaveClick : handleEditClick}
                style={{
                  padding: width600 ? "5px 8px" : "6px 10px",
                  border: "2px solid #000080",
                  borderRadius: "6px",
                  backgroundColor: isEditing ? "#000080" : "transparent",
                  color: isEditing ? "white" : "#000080",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={(e) => {
                  if (!isEditing) {
                    e.currentTarget.style.backgroundColor = "#000080";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isEditing) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#000080";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {isEditing ? <Save size={width600 ? 16 : 18} /> : <Edit size={width600 ? 16 : 18} />}
              </button>
            </div>
          )}

          {/* Ratings and Social Links - Below ratings */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            alignItems: width600 ? "center" : "flex-start",
            gap: width600 ? "8px" : "10px",
            marginTop: width600 ? "8px" : "10px"
          }}>
            {accountType === AccountType?.TRAINER &&
              showRatings(trainerRatings, "d-flex align-items-center")}
            
            {userInfo &&
              userInfo.extraInfo &&
              userInfo.extraInfo.social_media_links &&
              Object.keys(userInfo.extraInfo.social_media_links).some(key => userInfo.extraInfo.social_media_links[key]) && (
              <div style={{ 
                display: "flex",
                justifyContent: width600 ? "center" : "flex-start",
                width: "100%"
              }}>
                <SocialMediaIcons
                  profileImageURL={""}
                  social_media_links={userInfo.extraInfo.social_media_links}
                  isvisible={false}
                  isMobile={width600}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserInfoCard;
