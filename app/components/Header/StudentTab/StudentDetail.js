import React, { useState } from "react";
import { Utils } from "../../../../utils/utils";
import NavStudentRecord from "./NavStudentRecord";
import { useMediaQuery } from "../../../hook/useMediaQuery";
import UploadClipCard from "../../videoupload/UploadClipCard";

const StudentDetail = ({ videoClips, data }) => {
  // useEffect(() => {
  //    
  // }, [data]);
  const [progress,setProgress] = useState(0)
  const width600 = useMediaQuery(700);

  const trainee_id = data?._id;

  function addSuffix(name) {
    if (name) {
      return `${name}'s`
    }
    return ""
  }

  return (
    <div style={{ padding: width600 ? "10px" : "15px", maxWidth: "100%" }}>
      <h3 style={{ 
        textAlign: 'center', 
        marginBottom: width600 ? "15px" : "20px",
        fontSize: width600 ? "18px" : "22px",
        fontWeight: "600",
        color: "#333"
      }}>
        {addSuffix(data?.fullname)} Clips
      </h3>
      <div style={{
        display: 'flex',
        flexDirection: width600 ? "column" : "row",
        justifyContent: 'flex-start',
        alignItems: width600 ? "center" : "flex-start",
        gap: width600 ? "15px" : "20px",
        width: "100%"
      }}>
        {/* Left Sidebar - Profile Image and Upload */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: width600 ? "12px" : "15px",
          width: width600 ? "100%" : "auto",
          flexShrink: 0
        }}>
          {/* Profile Card */}
          <div className="card rounded trainer-profile-card" style={{
            width: width600 ? "100%" : "240px",
            maxWidth: width600 ? "100%" : "240px",
            border: "2px solid rgb(0, 0, 128)",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div className="card-body" style={{ padding: width600 ? "12px" : "15px" }}>
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center",
                gap: "12px"
              }}>
                <img
                  className="card-img-top"
                  src={Utils?.getImageUrlOfS3(data?.profile_picture) || '/assets/images/demoUser.png'}
                  alt="Student profile"
                  style={{
                    padding: "4px",
                    borderRadius: "8px",
                    objectFit: 'cover',
                    height: width600 ? "140px" : "160px",
                    width: width600 ? "140px" : "160px",
                    border: "2px solid #e0e0e0"
                  }}
                  onError={(e) => {
                    e.target.src = '/assets/images/demoUser.png';
                  }}
                />
                <h4 style={{ 
                  margin: 0,
                  fontSize: width600 ? "16px" : "18px",
                  fontWeight: "600",
                  color: "#333",
                  textAlign: "center"
                }}>
                  {data?.fullname}
                </h4>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="card rounded trainer-profile-card" style={{
            width: width600 ? "100%" : "240px",
            maxWidth: width600 ? "100%" : "240px",
            border: "2px solid rgb(0, 0, 128)",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div className="card-body" style={{ padding: width600 ? "12px" : "15px" }}>
              <UploadClipCard progress={progress} setProgress={setProgress} isFromCommunity={data?._id}/>
            </div>
          </div>
        </div>

        {/* Right Side - Clips Section */}
        <div className="card rounded trainer-profile-card" style={{
          flex: 1,
          minWidth: width600 ? "100%" : "300px",
          width: width600 ? "100%" : "auto",
          border: "2px solid rgb(0, 0, 128)",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ 
            padding: width600 ? "12px" : "18px",
            flex: 1,
            overflow: "auto"
          }}>
            <NavStudentRecord trainee_id={trainee_id}/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
