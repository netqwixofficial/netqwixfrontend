import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAppDispatch } from "../../store";
import { authState } from "../auth/auth.slice";
import { AccountType, LOCAL_STORAGE_KEYS } from "../../common/constants";
import {
  getRecentStudent,
  getRecentTrainers,
  getTraineeClips,
} from "../NavHomePage/navHomePage.api";
import Modal from "../../common/modal";
import { X } from "react-feather";
import StudentDetail from "../Header/StudentTab/StudentDetail";
import { Utils } from "../../../utils/utils";
import { useMediaQuery } from "../../hook/useMediaQuery";
import BookingTable from "../trainee/scheduleTraining/BookingTable.jsx";
import { TrainerDetails } from "../trainer/trainerDetails.jsx";
import { getTraineeWithSlotsAsync } from "../trainee/trainee.slice";
import RecentUsersSkeleton from "../common/RecentUsersSkeleton";

// const placeholderImageUrl = '/assets/images/avtar/user.png'; // Placeholder image path
const placeholderImageUrl = "/assets/images/demoUser.png"; // Placeholder image path

// Array.from({ length: 10 }, () => placeholderImageUrl)

const RecentUsers = ({ onTraineeSelect }) => {
  const [accountType, setAccountType] = useState("");
  const [recentStudent, setRecentStudent] = useState([]);
  const [recentTrainer, setRecentTrainer] = useState([]);

  const [recentFriends, setRecentFriends] = useState(
    Array.from({ length: 5 }, () => placeholderImageUrl)
  );
  const [recentStudentClips, setRecentStudentClips] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentData, SetselectedStudentData] = useState({});
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const width600 = useMediaQuery(600);
  const width900 = useMediaQuery(900);

  useEffect(() => {
    getRecentStudentApi();
    getRecentTrainerApi();
    setAccountType(localStorage.getItem(LOCAL_STORAGE_KEYS?.ACC_TYPE));
  }, []);

  // Initialize loading states when list changes
  useEffect(() => {
    const currentList = accountType === AccountType?.TRAINER ? recentStudent : recentTrainer;
    if (currentList && currentList.length > 0) {
      const initialLoadingStates = {};
      currentList.forEach((item) => {
        const itemId = item?._id || item?.id;
        if (itemId) {
          initialLoadingStates[itemId] = true; // Start with loading state
        }
      });
      setImageLoadingStates((prev) => ({ ...prev, ...initialLoadingStates }));
    }
  }, [recentStudent, recentTrainer, accountType]);

  const getRecentStudentApi = async () => {
    try {
      setIsLoading(true);
      let res = await getRecentStudent();
      // API returns { status: "SUCCESS", data: [...] }
      // axiosInstance returns response.data, so res is { status: "SUCCESS", data: [...] }
      // We need to access res.data to get the array
      const students = (res?.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      setRecentStudent(students);
      console.log("Recent students fetched:", students.length, "students");
    } catch (error) {
      console.error("Error fetching recent students:", error);
      setRecentStudent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecentTrainerApi = async () => {
    try {
      setIsLoading(true);
      let res = await getRecentTrainers();
      setRecentTrainer(res?.data || []);
    } catch (error) {
      console.error("Error fetching recent trainers:", error);
      setRecentTrainer([]);
    } finally {
      setIsLoading(false);
    }
  };
  const getTraineeClipsApi = async (id) => {
    try {
      let res = await getTraineeClips({ trainer_id: id });
      setRecentStudentClips(res?.data);
    } catch (error) {
       
    }
  };
  const handleStudentClick = (id) => {
    setRecentStudentClips(null);
    setIsOpen(true);
    getTraineeClipsApi(id);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setRecentStudentClips(null);
  };

  const [startDate, setStartDate] = useState(new Date());
  const [activeTrainer, setActiveTrainer] = useState([]);
  const [getParams, setParams] = useState("");
  const [query, setQuery] = useState("");
  const [trainer, setTrainer] = useState({ trainer_id: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState({
    id: null,
    trainer_id: null,
    data: {},
  });
  const [trainerInfo, setTrainerInfo] = useState({
    userInfo: null,
    selected_category: null,
  });
  const [categoryList, setCategoryList] = useState([]);
  const dispatch = useAppDispatch()

  // Responsive helpers
  const getImageSize = () => {
    if (width600) return { width: "65px", height: "65px" };
    if (width900) return { width: "75px", height: "75px" };
    return { width: "80px", height: "80px" };
  };

  const imageSize = getImageSize();

  // Responsive grid columns
  const getGridColumns = () => {
    if (width600) return "repeat(2, 1fr)";
    if (width900) return "repeat(3, 1fr)";
    return "repeat(4, 1fr)";
  };

  // Get the current list based on account type
  const currentList = accountType === AccountType?.TRAINER ? recentStudent : recentTrainer;

  // Handle image load state
  const handleImageLoad = (itemId) => {
    setImageLoadingStates((prev) => ({
      ...prev,
      [itemId]: false,
    }));
  };

  const handleImageLoadStart = (itemId) => {
    setImageLoadingStates((prev) => ({
      ...prev,
      [itemId]: true,
    }));
  };

  return (
    <>
      <style>{`
        .recent-users-container {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .recent-users-box {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 16px 12px;
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
          -webkit-overflow-scrolling: touch;
        }

        .recent-users-grid {
          display: grid;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
          padding-top: 8px;
        }

        .recent-users-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          cursor: pointer;
          padding: 10px 6px;
          border-radius: 10px;
          transition: all 0.3s ease;
          background-color: #fafafa;
          border: 1px solid #f0f0f0;
          min-height: 130px;
        }

        .recent-users-item:hover {
          background-color: #f5f5f5;
          transform: translateY(-4px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
          border-color: #000080;
        }

        .recent-users-avatar {
          border-radius: 50%;
          border: 3px solid rgb(0, 0, 128);
          padding: 2px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background-color: #fff;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .recent-users-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: opacity 0.3s ease;
        }

        .recent-users-avatar img.loaded {
          opacity: 1;
        }

        .recent-users-avatar img.loading {
          opacity: 0;
        }

        .recent-users-skeleton {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          position: absolute;
          top: 0;
          left: 0;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .recent-users-avatar-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .recent-users-name {
          max-width: 100%;
          margin-bottom: 0px;
          font-weight: 500;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
          padding: 0 4px;
          line-height: 1.3;
        }

        .recent-users-empty {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          color: #999;
          font-size: 14px;
          text-align: center;
        }

        /* Mobile */
        @media (max-width: 600px) {
          .recent-users-box {
            padding: 14px 8px;
          }

          .recent-users-item {
            min-height: 120px;
          }

          .recent-users-name {
            font-size: 12px;
          }
        }

        /* Tablet */
        @media (min-width: 601px) and (max-width: 900px) {
        }

        /* Desktop */
        @media (min-width: 901px) {
        }
      `}</style>
      <div className="card rounded trainer-profile-card Select Recent Student" style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "visible"
      }}>
      {trainerInfo && trainerInfo.userInfo ? (
        <Modal
          className="recent-user-modal"
          isOpen={isModalOpen}
          allowFullWidth={true}
          element={
            <TrainerDetails
              selectOption={trainerInfo}
              isPopoverOpen={isPopoverOpen}
              categoryList={categoryList}
              key={`trainerDetails`}
              searchQuery={query}
              trainerInfo={trainerInfo?.userInfo}
              selectTrainer={(_id, trainer_id, data) => {
                if (_id) {
                  setSelectedTrainer({
                    ...selectedTrainer,
                    id: _id,
                    trainer_id,
                    data,
                  });
                }
                setTrainerInfo((pre) => {
                  return {
                    ...pre,
                    userInfo: {
                      ...pre?.userInfo,
                      ...data,
                    },
                  };
                });
              }}
              onClose={() => {
                setTrainerInfo((prev) => ({
                  ...prev,
                  userInfo: undefined,
                  selected_category: undefined,
                }));
                setParams((prev) => ({
                  ...prev,
                  search: null,
                }));
                setIsModalOpen(false);
              }}
              isUserOnline={true}
              element={
                <BookingTable
                  selectedTrainer={selectedTrainer}
                  trainerInfo={trainerInfo}
                  setStartDate={setStartDate}
                  startDate={startDate}
                  getParams={getParams}
                  isUserOnline={true}
                />
              }
            />
          }
        />
      ) : (
        <></>
      )}
      <h2
        className="Recent-Heading"
        style={{ 
          textAlign: "center", 
          fontSize: width600 ? "18px" : "20px",
          fontWeight: "600",
          color: "#333",
          marginBottom: width600 ? "10px" : "15px",
          paddingTop: width600 ? "12px" : "15px",
          paddingLeft: width600 ? "8px" : "0",
          paddingRight: width600 ? "8px" : "0",
          display: "block",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        Recent {accountType === AccountType?.TRAINER ? "Students" : "Experts"}
      </h2>
      <div
        className="card-body Recent"
        style={{
          width: "100%",
          marginTop: "0px",
          padding: width600 ? "8px 6px" : "15px 12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: "1"
        }}
      >
        <div className="recent-users-container">
          {isLoading ? (
            <RecentUsersSkeleton />
          ) : (
          <div className="recent-users-box">
          {currentList && currentList.length > 0 ? (
            <div 
              className="recent-users-grid"
              style={{
                gridTemplateColumns: getGridColumns(),
              }}
            >
              {currentList.map((item, index) => (
                <div
                  key={item?._id || item?.id || index}
                  className="recent-users-item"
                  onClick={() => {
                    if (accountType === AccountType?.TRAINER) {
                      const traineeId = item?._id || item?.id;
                      if (onTraineeSelect) {
                        onTraineeSelect(traineeId);
                      }
                      handleStudentClick(traineeId);
                      SetselectedStudentData({ ...item });
                    } else {
                      setTrainerInfo((prev) => ({
                        ...prev,
                        userInfo: item,
                        selected_category: null,
                      }));
                      setSelectedTrainer({
                        id: item?.id || item?._id,
                        trainer_id: item?.id || item?._id,
                        data: item,
                      });
                      dispatch(getTraineeWithSlotsAsync({ search: item?.fullname || item?.fullName }));
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <div
                    className="recent-users-avatar"
                    style={{
                      width: imageSize.width,
                      height: imageSize.height,
                    }}
                  >
                    <div className="recent-users-avatar-wrapper">
                      {(imageLoadingStates[item?._id || item?.id] !== false) && (
                        <div className="recent-users-skeleton" />
                      )}
                      <img
                        className={`Image-Division ${imageLoadingStates[item?._id || item?.id] === false ? 'loaded' : 'loading'}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                        }}
                        src={
                          Utils?.getImageUrlOfS3(item?.profile_picture || item.profile_picture) ||
                          "/assets/images/demoUser.png"
                        }
                        alt={
                          accountType === AccountType?.TRAINER
                            ? `Recent Student ${index + 1}`
                            : `Recent Expert ${index + 1}`
                        }
                        onLoadStart={() => handleImageLoadStart(item?._id || item?.id)}
                        onLoad={() => handleImageLoad(item?._id || item?.id)}
                        onError={(e) => {
                          e.target.src = "/assets/images/demoUser.png";
                          handleImageLoad(item?._id || item?.id);
                        }}
                      />
                    </div>
                  </div>
                  <h5
                    className="recent-users-name"
                    style={{
                      fontSize: width600 ? "12px" : "13px",
                    }}
                  >
                    {item?.fullname || item?.fullName || 'Unknown'}
                  </h5>
                </div>
              ))}
            </div>
          ) : (
            <div className="recent-users-empty">
              No recent {accountType === AccountType?.TRAINER ? "students" : "experts"} found
            </div>
          )}
        </div>
          )}
        </div>
      </div>
      {accountType === AccountType?.TRAINER && (
        <Modal
          isOpen={isOpen}
          element={
            <div className="container media-gallery portfolio-section grid-portfolio ">
              <div className="theme-title">
                <div className="media">
                  <div className="media-body media-body text-right">
                    <div
                      className="icon-btn btn-sm btn-outline-light close-apps pointer"
                      onClick={handleCloseModal}
                    >
                      <X />
                    </div>
                  </div>
                </div>
                <StudentDetail
                  videoClips={recentStudentClips}
                  data={selectedStudentData}
                />
              </div>
            </div>
          }
        />
      )}
    </div>
    </>
  );
};

export default RecentUsers;
