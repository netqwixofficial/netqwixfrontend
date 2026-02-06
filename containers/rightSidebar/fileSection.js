import { useEffect, useState, useRef } from "react";
import { Nav, NavLink, NavItem, TabContent, TabPane, Col, Button, Row } from "reactstrap";
import { Link, X, ChevronLeft, ChevronRight } from "react-feather";
import { FaDownload, FaTrash } from "react-icons/fa";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { videouploadAction, videouploadState } from "../../app/components/videoupload/videoupload.slice";
import { myClips, reports, traineeClips } from "./fileSection.api";
import { LOCAL_STORAGE_KEYS, AccountType, topNavbarOptions } from "../../app/common/constants";
import Modal from "../../app/common/modal";
import VideoUpload from "../../app/components/videoupload";
import ReportModal from "../../app/components/video/reportModal";

import { Tooltip } from "react-tippy";
import { Utils } from "../../utils/utils";
import { authAction, authState } from "../../app/components/auth/auth.slice";
import { awsS3Url } from "../../utils/constant";
import { useMediaQuery } from "../../app/hook/useMediaQuery";
import { Spinner } from "reactstrap";
import { deleteClip } from "./fileSection.api";
import { toast } from "react-toastify";
import ConfirmModal from "../../app/components/locker/my-clips/confirmModal";

const fiveImageGallary = [
  {
    mainColClass: "isotopeSelector filter",
    mediaClass: "media-big",
    src: "/assets/images/gallery/1.jpg",
    width: 150,
    height: 150,
  },
  {
    mediaClass: "media-small isotopeSelector filter",
    src: "/assets/images/gallery/2.jpg",
    width: 150,
    height: 150,
    Children: [
      {
        mediaClass: "media-small isotopeSelector filter",
        src: "/assets/images/gallery/3.jpg",
        width: 150,
        height: 150,
      },
    ],
  },
  {
    mediaClass: "media-small isotopeSelector filter",
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    Children: [
      {
        mediaClass: "media-small isotopeSelector filter fashion",
        src: "/assets/images/gallery/5.jpg",
        width: 150,
        height: 150,
      },
    ],
  },
];
const eightImageGallary = [
  {
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  }, {
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  }, {
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  }, {
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  }, {
    src: "/assets/images/gallery/4.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  },
  {
    src: "/assets/images/gallery/3.jpg",
    width: 150,
    height: 150,
    mediaClass: "media-small isotopeSelector filter",
  },
];

var netquixVideos = [{
  "_id": "656acd81cd2d7329ed0d8e91",
  "title": "Dog Activity",
  "category": "Acting",
  "user_id": "6533881d1e8775aaa25b3b6e",
  "createdAt": "2023-12-02T06:24:01.995Z",
  "updatedAt": "2023-12-02T06:24:01.995Z",
  "__v": 0
},
{
  "_id": "657053c4c440a4d0d775e639",
  "title": "Pupppy clip",
  "category": "Golf",
  "user_id": "64ad7aae6d668be38e53be1b",
  "createdAt": "2023-12-06T10:58:12.080Z",
  "updatedAt": "2023-12-06T10:58:12.080Z",
  "__v": 0
}]

const FileSection = (props) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let lightbox = new PhotoSwipeLightbox({
      gallery: "#" + "my-test-gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox.init();

    let lightbox2 = new PhotoSwipeLightbox({
      gallery: "#" + "my-gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox2.init();

    let lightbox3 = new PhotoSwipeLightbox({
      gallery: "#" + "gallery8",
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox3.init();
    let lightbox4 = new PhotoSwipeLightbox({
      gallery: "#" + "gallery",
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox4.init();

    return () => {
      lightbox.destroy();
      lightbox = null;
      lightbox2.destroy();
      lightbox2 = null;
      lightbox3.destroy();
      lightbox3 = null;
      lightbox4.destroy();
      lightbox4 = null;
    };
  }, []);
  const { isOpen } = useAppSelector(videouploadState);
  const [activeTab, setActiveTab] = useState("media");
  const [clips, setClips] = useState([]);
  const [collapse1, setCollapse1] = useState(false);
  const [collapse2, setCollapse2] = useState(false);
  const [collapse3, setCollapse3] = useState(false);
  const [collapse4, setCollapse4] = useState(false);
  const [isOpenPlayVideo, setIsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedClip, setSelectedClip] = useState(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoPlayerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [traineeClip, setTraineeClips] = useState([]);
  const [accountType, setAccountType] = useState("");
  const [reportsData, setReportsData] = useState([]);
  const [isOpenPDF, setIsOpenPDF] = useState(false);
  const [reportName, setReportName] = useState("");
  const [isOpenReport, setIsOpenReport] = useState(false);
  const { sidebarLockerActiveTab, userInfo } = useAppSelector(authState);
  const [currentReportData, setCurrentReportData] = useState({})
  const [reportObj, setReportObj] = useState({ title: "", topic: "" });
  const [screenShots, setScreenShots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const width500 = useMediaQuery(500);

  const [videoDimensions, setVideoDimensions] = useState({ 
    maxWidth: width500 ? "100%" : "600px",
    width: width500 ? "100%" : "auto",
    height: width500 ? "70vh" : "75vh",
    maxHeight: width500 ? "600px" : "800px",
    minHeight: width500 ? "400px" : "500px",
  });

  useEffect(() => {
    setActiveTab(sidebarLockerActiveTab)
    if (sidebarLockerActiveTab === "report") {
      var temp = reportsData
      temp = temp.map((vl, i) => { return i === 0 ? { ...vl, show: true } : { ...vl, show: false } })
      setReportsData([...temp])
    }
  }, [sidebarLockerActiveTab])

  const handleVideoLoad = (event) => {
    const video = event.target;
    const aspectRatio = video.videoWidth / video.videoHeight;

    // Set width and height based on aspect ratio and device
    if (aspectRatio > 1) {
      // Landscape video
      setVideoDimensions({ 
        width: width500 ? "100%" : "90%", 
        maxWidth: width500 ? "100%" : "800px",
        height: width500 ? "65vh" : "70vh",
        maxHeight: width500 ? "500px" : "700px",
        minHeight: width500 ? "350px" : "450px"
      });
    } else {
      // Portrait/square video
      setVideoDimensions({
        maxWidth: width500 ? "100%" : "600px",
        width: width500 ? "100%" : "auto",
        height: width500 ? "75vh" : "80vh",
        maxHeight: width500 ? "600px" : "800px",
        minHeight: width500 ? "450px" : "550px"
      });
    }
  };

  const findNextClipPosition = () => {
    if (currentGroupIndex === null || currentClipIndex === null) return null;

    // Check if we're in trainee clips or regular clips
    const currentClips = activeTab === "trainee" ? traineeClip : clips;
    if (!currentClips || currentClips.length === 0) return null;

    let g = currentGroupIndex;
    let c = currentClipIndex + 1;

    while (g < currentClips.length) {
      const group = currentClips[g];
      const clipsInGroup = activeTab === "trainee" ? (group?.clips || []).map(clp => clp?.clips) : (group?.clips || []);
      if (c < clipsInGroup.length) {
        const clip = clipsInGroup[c];
        return { groupIndex: g, clipIndex: c, clip: activeTab === "trainee" ? clip : clip };
      }
      g += 1;
      c = 0;
    }
    return null;
  };

  const findPreviousClipPosition = () => {
    if (currentGroupIndex === null || currentClipIndex === null) return null;

    // Check if we're in trainee clips or regular clips
    const currentClips = activeTab === "trainee" ? traineeClip : clips;
    if (!currentClips || currentClips.length === 0) return null;

    let g = currentGroupIndex;
    let c = currentClipIndex - 1;

    while (g >= 0) {
      const group = currentClips[g];
      const clipsInGroup = activeTab === "trainee" ? (group?.clips || []).map(clp => clp?.clips) : (group?.clips || []);
      if (c >= 0 && c < clipsInGroup.length) {
        const clip = clipsInGroup[c];
        return { groupIndex: g, clipIndex: c, clip: activeTab === "trainee" ? clip : clip };
      }
      g -= 1;
      if (g >= 0) {
        const prevGroup = currentClips[g];
        const prevClips = activeTab === "trainee" ? (prevGroup?.clips || []).map(clp => clp?.clips) : (prevGroup?.clips || []);
        c = prevClips.length - 1;
      }
    }
    return null;
  };

  const handleNextClip = () => {
    const next = findNextClipPosition();
    if (!next) return;
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.currentTime = 0;
    }
    setIsVideoLoading(true);
    setCurrentGroupIndex(next.groupIndex);
    setCurrentClipIndex(next.clipIndex);
    setSelectedVideo(Utils?.generateVideoURL(next.clip));
    setSelectedClip(next.clip);
  };

  const handlePreviousClip = () => {
    const prev = findPreviousClipPosition();
    if (!prev) return;
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.currentTime = 0;
    }
    setIsVideoLoading(true);
    setCurrentGroupIndex(prev.groupIndex);
    setCurrentClipIndex(prev.clipIndex);
    setSelectedVideo(Utils?.generateVideoURL(prev.clip));
    setSelectedClip(prev.clip);
  };

  useEffect(() => {
    if (!isOpen && props.activeTabParent === 'file') getMyClips()
  }, [props.activeTabParent])

  useEffect(() => {
    setAccountType(localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE));
  }, []);

  const getMyClips = async () => {
    setIsLoading(true);
    try {
      setClips([])
      setTraineeClips([])
      var res = await myClips({})
      let temp = res?.data
      temp = temp.map(vl => { return { ...vl, show: false } })
      if (temp.length > 0) temp[0].show = true
      setClips([...temp])
      var res2 = await traineeClips({})
      setTraineeClips(res2?.data)
      var res3 = await reports({})
      setReportsData(res3?.result || [])
    } catch (error) {
      console.error("Error fetching clips data:", error);
      // Optionally show user-facing notification/toast here
      // For now, we'll just log the error and ensure state is cleared
      setClips([])
      setTraineeClips([])
      setReportsData([])
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { setActiveTab("media") }, [])

  const handleDelete = async (id) => {
    const res = await deleteClip({ id });
    if (res?.success) {
      toast.success(res?.message);
      setIsConfirmModalOpen(false);
      setSelectedId(null);
      await getMyClips();
    } else {
      toast.error(res?.message);
    }
  };

  const handleCloseModal = () => {
    setIsConfirmModalOpen(false);
    setSelectedId(null);
  };

  return (
    <div className="apps-content" id="files" style={{ padding: "15px 20px" }}>
      <div className="theme-title" style={{ marginBottom: "20px" }}>
        <div className="media">
          <div>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#333" }}>Locker</h2>
            {/* <h4>Shared Media</h4> */}
          </div>
          <div className="media-body media-body text-right">
            <div
              className="icon-btn btn-sm btn-outline-light close-apps pointer"
              onClick={() => { dispatch(authAction?.setActiveModalTab(null)); dispatch(authAction?.setActiveLockerTab(null)); props.smallSideBarToggle() }}
              style={{
                padding: "8px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <X />
            </div>
          </div>
        </div>
      </div>
      <Button 
        className="button-effect mb-3" 
        style={{ 
          width: "100%", 
          justifyContent: 'center',
          display: 'flex',
          alignItems: 'center',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: '600',
          backgroundColor: '#007bff',
          borderColor: '#007bff',
          color: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
          transition: 'all 0.3s ease',
          marginBottom: '20px'
        }} 
        color="primary" 
        onClick={() => dispatch(videouploadAction.setIsOpen(true))}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0056b3';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#007bff';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
        }}
      >
        Upload Clip
      </Button>
      <VideoUpload />
      <div className="theme-tab" style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Nav tabs style={{ borderBottom: "2px solid #e0e0e0" }}>
          <div className="row" style={{ width: '100%', alignItems: 'center', margin: "0px", gap: "8px" }}>
            <div className="col" style={{ padding: "0px 4px", flex: "1 1 0" }}>
              <NavItem>
                <NavLink
                  className={`button-effect ${activeTab === "media" ? "active" : ""}`}
                  onClick={() => setActiveTab("media")}
                  style={{ 
                    width: '100%',
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderRadius: '6px 6px 0 0',
                    backgroundColor: activeTab === "media" ? '#007bff' : 'transparent',
                    color: activeTab === "media" ? '#ffffff' : '#666',
                    fontWeight: activeTab === "media" ? '600' : '500',
                    borderBottom: activeTab === "media" ? '3px solid #007bff' : '3px solid transparent',
                    transition: 'all 0.3s ease',
                    margin: "0 2px"
                  }}
                >
                  My Clips
                </NavLink>
              </NavItem>
            </div>
            <div className="col" style={{ padding: "0px 4px", flex: "1 1 0" }}>
              <NavItem>
                <NavLink
                  className={`button-effect ${activeTab === "report" ? "active" : ""}`}
                  onClick={() => setActiveTab("report")}
                  style={{ 
                    width: '100%',
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderRadius: '6px 6px 0 0',
                    backgroundColor: activeTab === "report" ? '#007bff' : 'transparent',
                    color: activeTab === "report" ? '#ffffff' : '#666',
                    fontWeight: activeTab === "report" ? '600' : '500',
                    borderBottom: activeTab === "report" ? '3px solid #007bff' : '3px solid transparent',
                    transition: 'all 0.3s ease',
                    margin: "0 2px"
                  }}
                >
                  Reports
                </NavLink>
              </NavItem>
            </div>
            {accountType === "Trainer" && (
              <>
                <div className="col" style={{ padding: "0px 4px", flex: "1 1 0" }}>
                  <NavItem>
                    <NavLink
                      className={`button-effect ${activeTab === "trainee" ? "active" : ""}`}
                      onClick={() => setActiveTab("trainee")}
                      style={{ 
                        width: '100%',
                        textAlign: 'center',
                        padding: '12px 16px',
                        borderRadius: '6px 6px 0 0',
                        backgroundColor: activeTab === "trainee" ? '#007bff' : 'transparent',
                        color: activeTab === "trainee" ? '#ffffff' : '#666',
                        fontWeight: activeTab === "trainee" ? '600' : '500',
                        borderBottom: activeTab === "trainee" ? '3px solid #007bff' : '3px solid transparent',
                        transition: 'all 0.3s ease',
                        margin: "0 2px"
                      }}
                    >
                      Enthusiasts
                    </NavLink>
                  </NavItem>
                </div>
                <div className="col" style={{ padding: "0px 4px", flex: "1 1 0" }}>
                  <NavItem>
                    <NavLink
                      className={`button-effect ${activeTab === "docs" ? "active" : ""}`}
                      onClick={() => setActiveTab("docs")}
                      style={{ 
                        width: '100%',
                        textAlign: 'center',
                        padding: '12px 16px',
                        borderRadius: '6px 6px 0 0',
                        backgroundColor: activeTab === "docs" ? '#007bff' : 'transparent',
                        color: activeTab === "docs" ? '#ffffff' : '#666',
                        fontWeight: activeTab === "docs" ? '600' : '500',
                        borderBottom: activeTab === "docs" ? '3px solid #007bff' : '3px solid transparent',
                        transition: 'all 0.3s ease',
                        margin: "0 2px"
                      }}
                    >
                      NetQwix
                    </NavLink>
                  </NavItem>
                </div>
              </>
            )}
          </div>
        </Nav>
      </div>
      <div className="file-tab" style={{ paddingTop: "10px", paddingBottom: "20px" }}>
        <TabContent activeTab={activeTab} className="custom-scroll" style={{ minHeight: "400px", paddingBottom: "20px" }}>
          <TabPane tabId="media">
            {isLoading ? (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                minHeight: "240px",
                gap: "12px"
              }}>
                <Spinner color="primary" style={{ width: "2.5rem", height: "2.5rem" }} />
                <h5 style={{ color: "#666", margin: 0, fontSize: "14px" }}>
                  Loading your clips...
                </h5>
              </div>
            ) : (
            <div className="media-gallery portfolio-section grid-portfolio">
              {clips?.length ? clips?.map((cl, ind) =>
                <div className={`collapse-block ${!cl?.show ? "" : "open"}`}>
                  <h5
                    className="block-title"
                    onClick={() => {
                      // Toggle only the clicked section and keep others as they are,
                      // so multiple sections can be open or closed independently.
                      const updatedClips = clips.map((vl, i) =>
                        i === ind ? { ...vl, show: !vl.show } : vl
                      );
                      setClips(updatedClips);
                    }}
                  >
                    {cl?._id}
                    <label className="badge badge-primary sm ml-2">{cl?.clips?.length}</label>
                  </h5>
                  {/*  NORMAL  STRUCTURE END  */}
                  <div className={`block-content ${!cl?.show ? "d-none" : ""}`} style={{ padding: "15px 10px", marginBottom: "15px" }}>
                    <div className="row m-0" style={{ display: "flex", flexWrap: "wrap", margin: "0 -4px" }}>
                      {cl?.clips.map((clp, index) => (
                        <div
                          key={index}
                          className="col-4"
                          style={{ 
                            borderRadius: 8,
                            padding: "4px",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            width: "33.333%",
                            flex: "0 0 33.333%",
                            maxWidth: "33.333%",
                            boxSizing: "border-box"
                          }}
                          onClick={() => {
                            setIsVideoLoading(false);
                            setSelectedVideo(Utils?.generateVideoURL(clp))
                            setSelectedClip(clp)
                            setCurrentGroupIndex(ind)
                            setCurrentClipIndex(index)
                            setIsOpen(true)
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Tooltip title={clp?.title} position="top" trigger="mouseenter">
                            <video className="Sidebar-video"
                              poster={Utils?.generateThumbnailURL(clp)}
                              style={{
                                position: "relative",
                                width: "100%",
                                border: "3px solid #b4bbd1",
                                borderRadius: "8px",
                                objectFit: "cover",
                                aspectRatio: "1/1",
                                display: "block"
                              }}
                            >
                              <source src={Utils?.generateVideoURL(clp)} type="video/mp4" />
                            </video>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
                  <h5 className="block-title">  No Data Found</h5>
                </div>
              </>}
            </div>
            )}
          </TabPane>
          <TabPane tabId="trainee">
            <div className="media-gallery portfolio-section grid-portfolio">
              {traineeClip?.length ? traineeClip?.map((cl, ind) =>
                <div className={`collapse-block ${!cl?.show ? "" : "open"}`}>
                  <h5
                    className="block-title"
                    onClick={() => {
                      // Toggle only the clicked trainee section; allow multiple open.
                      const updatedTraineeClips = traineeClip.map((vl, i) =>
                        i === ind ? { ...vl, show: !vl.show } : vl
                      );
                      setTraineeClips(updatedTraineeClips);
                    }}
                  >
                    {cl?._id?.fullname}
                    <label className="badge badge-primary sm ml-2">{cl?.clips?.length}</label>
                  </h5>
                  {/*  NORMAL  STRUCTURE END  */}
                  <div className={`block-content ${!cl?.show ? "d-none" : ""}`} style={{ padding: "15px 10px", marginBottom: "15px" }}>
                    <div className="row m-0" style={{ display: "flex", flexWrap: "wrap", margin: "0 -4px" }}>
                      {cl?.clips.map((clp, index) => (
                        <div
                          key={index}
                          className="col-4"
                          style={{ 
                            borderRadius: 8,
                            padding: "4px",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            width: "33.333%",
                            flex: "0 0 33.333%",
                            maxWidth: "33.333%",
                            boxSizing: "border-box"
                          }}
                          onClick={() => {
                            setIsVideoLoading(false);
                            setSelectedVideo(Utils?.generateVideoURL(clp?.clips))
                            setSelectedClip(clp?.clips)
                            // For trainee clips, we need to find the group index
                            const groupIndex = traineeClip.findIndex(tc => tc._id?.fullname === cl?._id?.fullname);
                            setCurrentGroupIndex(groupIndex);
                            setCurrentClipIndex(index);
                            setIsOpen(true)
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Tooltip title={clp?.clips?.title} position="top" trigger="mouseenter">
                            <video poster={Utils?.generateThumbnailURL(clp?.clips)} style={{
                              position: "relative",
                              width: "100%",
                              border: "3px solid #b4bbd1",
                              borderRadius: "8px",
                              objectFit: "cover",
                              aspectRatio: "1/1",
                              display: "block"
                            }}>
                              <source src={Utils?.generateVideoURL(clp?.clips)} type="video/mp4" />
                            </video>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
                <h5 className="block-title">  No Data Found</h5>
              </div>}
            </div>
          </TabPane>
          <TabPane tabId="link">
            <div className="media-gallery portfolio-section grid-portfolio">
              <div className={`collapse-block ${collapse1 ? "" : "open"}`}>
                <h5
                  className="block-title"
                  onClick={() => setCollapse1(!collapse1)}
                >
                  12/12/2019
                  <label className="badge badge-primary sm ml-2">8</label>
                </h5>
                <div className={`block-content ${collapse1 ? "d-none" : ""}`}>
                  <div className="row share-media zoom-gallery">
                    <div className="pswp-gallery row mx-0" id="my-test-gallery">
                      {fiveImageGallary.map((image, index) => (
                        <div
                          key={index}
                          className={`col-4 ${image.mainColClass ? image.mainColClass : ""
                            }`}
                        >
                          <div className={image.mediaClass}>
                            <div className="overlay">
                              <div className="border-portfolio">
                                <a
                                  href={image.src}
                                  data-pswp-width={image.width}
                                  data-pswp-height={image.height}
                                  rel="noreferrer"
                                >
                                  <div className="overlay-background">
                                    <i
                                      className="ti-plus"
                                      aria-hidden="true"
                                    ></i>
                                  </div>
                                  <img
                                    src={image.src}
                                    className="img-fluid"
                                    alt=""
                                  />
                                </a>
                              </div>
                            </div>
                          </div>
                          {image.Children &&
                            image.Children.map((data, index) => (
                              <div key={index} className={data.mediaClass}>
                                <div className="overlay">
                                  <div className="border-portfolio">
                                    <div
                                      className="pswp-gallery"
                                      id="my-test-gallery"
                                    >
                                      <a
                                        href={data.src}
                                        data-pswp-width={data.width}
                                        data-pswp-height={data.height}
                                        rel="noreferrer"
                                      >
                                        <div className="overlay-background">
                                          <i
                                            className="ti-plus"
                                            aria-hidden="true"
                                          ></i>
                                        </div>
                                        <img src={data.src} alt="" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <h5
                  className="block-title"
                  onClick={() => setCollapse2(!collapse2)}
                >
                  10/01/2020
                  <label className="badge badge-primary sm ml-2">5</label>
                </h5>
                <div className={`block-content ${collapse2 ? "d-none" : ""}`}>
                  <div className="row share-media zoom-gallery">
                    <div className="pswp-gallery row mx-0" id="my-gallery">
                      {fiveImageGallary.map((image, index) => (
                        <div
                          key={index}
                          className={`col-4 ${image.mainColClass && image.mainColClass
                            }`}
                        >
                          <div className={image.mediaClass}>
                            <div className="overlay">
                              <div className="border-portfolio">
                                <a
                                  href={image.src}
                                  data-pswp-width={image.width}
                                  data-pswp-height={image.height}
                                  rel="noreferrer"
                                >
                                  <div className="overlay-background">
                                    <i
                                      className="ti-plus"
                                      aria-hidden="true"
                                    ></i>
                                  </div>
                                  <img src={image.src} alt="" />
                                </a>
                              </div>
                            </div>
                          </div>
                          {image.Children &&
                            image.Children.map((data, index2) => (
                              <div key={index2} className={data.mediaClass}>
                                <div className="overlay">
                                  <div className="border-portfolio">
                                    <div
                                      className="pswp-gallery"
                                      id="my-test-gallery"
                                    >
                                      <a
                                        href={data.src}
                                        data-pswp-width={data.width}
                                        data-pswp-height={data.height}
                                        rel="noreferrer"
                                      >
                                        <div className="overlay-background">
                                          <i
                                            className="ti-plus"
                                            aria-hidden="true"
                                          ></i>
                                        </div>
                                        <img src={data.src} alt="" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/*  Eight  STRUCTURE Start  */}
                <h5
                  className="block-title"
                  onClick={() => setCollapse3(!collapse3)}
                >
                  30/04/2020
                  <label className="badge badge-primary sm ml-2">2</label>
                </h5>
                <div className={`block-content ${collapse3 ? "d-none" : ""}`}>
                  <div className="row share-media zoom-gallery">
                    <div className="pswp-gallery row mx-0" id="gallery8">
                      {eightImageGallary.map((image, index) => (
                        <div
                          key={index}
                          className={`col-4 ${image.mainColClass && image.mainColClass
                            }`}
                        >
                          <div className={image.mediaClass}>
                            <div className="overlay">
                              <div className="border-portfolio">
                                {/* <div
                                className="pswp-gallery"
                                id="my-test-gallery"
                              > */}
                                <a
                                  href={image.src}
                                  data-pswp-width={image.width}
                                  data-pswp-height={image.height}
                                  rel="noreferrer"
                                >
                                  <div className="overlay-background">
                                    <i
                                      className="ti-plus"
                                      aria-hidden="true"
                                    ></i>
                                  </div>
                                  <img src={image.src} alt="" />
                                </a>
                                {/* </div> */}
                              </div>
                            </div>
                          </div>
                          {image.Children &&
                            image.Children.map((data, index2) => (
                              <div key={index2} className={data.mediaClass}>
                                <div className="overlay">
                                  <div className="border-portfolio">
                                    <div
                                      className="pswp-gallery"
                                      id="my-test-gallery"
                                    >
                                      <a
                                        href={data.src}
                                        data-pswp-width={data.width}
                                        data-pswp-height={data.height}
                                        rel="noreferrer"
                                      >
                                        <div className="overlay-background">
                                          <i
                                            className="ti-plus"
                                            aria-hidden="true"
                                          ></i>
                                        </div>
                                        <img src={data.src} alt="" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/*  Eight  STRUCTURE END  */}
                <h5
                  className="block-title"
                  onClick={() => setCollapse4(!collapse4)}
                >
                  10/01/2020
                  <label className="badge badge-primary sm ml-2">2</label>
                </h5>
                {/*  NORMAL  STRUCTURE END  */}
                <div className={`block-content ${collapse4 ? "d-none" : ""}`}>
                  <div className="row share-media zoom-gallery">
                    <div className="pswp-gallery row mx-0" id="gallery">
                      {eightImageGallary.map((image, index) => (
                        <div
                          key={index}
                          className={`col-4 ${image.mainColClass && image.mainColClass
                            }`}
                        >
                          <div className={image.mediaClass}>
                            <div className="overlay">
                              <div className="border-portfolio">
                                <a
                                  href={image.src}
                                  data-pswp-width={image.width}
                                  data-pswp-height={image.height}
                                  rel="noreferrer"
                                >
                                  <div className="overlay-background">
                                    <i
                                      className="ti-plus"
                                      aria-hidden="true"
                                    ></i>
                                  </div>
                                  <img src={image.src} alt="" />
                                </a>
                              </div>
                            </div>
                          </div>
                          {image.Children &&
                            image.Children.map((data, index2) => (
                              <div key={index2} className={data.mediaClass}>
                                <div className="overlay">
                                  <div className="border-portfolio">
                                    <div
                                      className="pswp-gallery"
                                      id="my-test-gallery"
                                    >
                                      <a
                                        href={data.src}
                                        data-pswp-width={data.width}
                                        data-pswp-height={data.height}
                                        rel="noreferrer"
                                      >
                                        <div className="overlay-background">
                                          <i
                                            className="ti-plus"
                                            aria-hidden="true"
                                          ></i>
                                        </div>
                                        <img src={data.src} alt="" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>
          <TabPane tabId="docs">
            <div className="media-gallery portfolio-section grid-portfolio">
              <div className={`collapse-block ${collapse1 ? "" : "open"}`}>
                <div className={`block-content ${collapse4 ? "d-none" : ""}`}>
                  <div className="row">
                    {netquixVideos.map((clp, index) => (
                      <div
                        key={index}
                        className={`col-6 p-1`}
                        style={{ borderRadius: 5 }}
                        onClick={() => {
                          setSelectedVideo(Utils?.generateVideoURL(clp))
                          setIsOpen(true)
                        }}
                      >
                        <Tooltip title="Title" position="top" trigger="mouseenter">
                          <video style={{ width: "100%", height: "100%" }}  >
                            <source src={Utils?.generateVideoURL(clp)} type="video/mp4" />
                          </video>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabPane>
          <TabPane tabId="report">
            <div className="media-gallery portfolio-section grid-portfolio">
              {reportsData?.length ? reportsData?.map((cl, ind) =>
                <div className={`collapse-block ${!cl?.show ? "" : "open"}`}>
                  <h5
                    className="block-title"
                    onClick={() => {
                      // Toggle only the clicked report section; allow multiple open.
                      const updatedReports = reportsData.map((vl, i) =>
                        i === ind ? { ...vl, show: !vl.show } : vl
                      );
                      setReportsData(updatedReports);
                    }}
                  >
                    <label className="badge badge-primary sm ml-2" onClick={() => {}}>{`${cl?._id?.month}/${cl?._id?.day}/${cl?._id?.year}`}</label>
                  </h5>
                  {/*  NORMAL  STRUCTURE END  */}
                  <div className={`block-content ${!cl?.show ? "d-none" : "d-flex flex-wrap"}`}>
                    {cl?.report.map((clp, index) => (
                      <div className={`col-6`} key={index} style={{ whiteSpace: "nowrap" }}>
                        <div
                          // className="ml-3" 
                          style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ marginBottom: "5px" }}>
                            <dd
                              // className="ml-3"
                              style={{ cursor: "pointer", textAlign: "center" , textWrap:'nowrap' }}
                              onClick={() => {
                                if (accountType === "Trainer") {
                                  setCurrentReportData({ session: clp?.session?._id, trainer: clp?.trainer?._id, trainee: clp?.trainee?._id })
                                  setIsOpenReport(true)
                                } else {
                                  setIsOpenPDF(true)
                                  setReportName(clp?.session?.report)
                                }
                              }}
                            >
                              {/* <img
                                src="/icons/FileSee.png" // Adjust the path to your PNG icon
                                alt="FileSee Icon"
                                style={{ width: "30px", height: "30px" }} // Adjust the size accordingly
                              /> */}
                              <img
                                src={Utils.getImageUrlOfS3(clp?.reportData[0]?.imageUrl)}
                                alt={clp?.reportData[0]?.title}
                                style={{
                                  // width: "12vw",
                                  // height: "100px",
                                  position: "relative",
                                  // marginLeft: '50px',
                                  height: "100%",
                                  width: "100%",
                                  objectFit: "contain",
                                  maxHeight: "120px"
                                }}
                              />
                              {accountType === "Trainer" ? "" : ""}
                            </dd>
                          </div>
                          <div className="ml-3" style={{ fontSize: "10px" }}>
                            <dd>{index + 1}. {accountType === "Trainer" ? "Enthusiasts" : "Expert"} : <strong>{clp?.[accountType === "Trainer" ? "trainee" : "trainer"]?.fullname}</strong></dd>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>


                </div>
              ) : <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
                <h5 className="block-title">  No Data Found</h5>
              </div>}
            </div>
          </TabPane>
        </TabContent>
      </div>

      <Modal
        isOpen={isOpenPlayVideo}
        element={
          <>
            <div className="d-flex flex-column align-items-center justify-content-center h-100" style={{ padding: "20px", minHeight: "100vh", maxHeight: "100vh", overflow: "auto" }}>
              <div
                className="position-relative"
                style={{ 
                  borderRadius: 8, 
                  maxWidth: "100%",
                  width: "100%",
                  backgroundColor: "#1a1a1a",
                  padding: "20px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                {/* Close button */}
                <div className="media-body text-right" style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10 }}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close video"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: "50%",
                      padding: "8px"
                    }}
                  >
                    <X />
                  </button>
                </div>

                {/* Title at top center */}
                {selectedClip && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "20px",
                      paddingTop: "10px"
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#fff",
                        textAlign: "center",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        maxWidth: "80%",
                      }}
                    >
                      {selectedClip.title}
                    </h4>
                  </div>
                )}

                {/* Video with navigation buttons */}
                <div className="d-flex align-items-center justify-content-center" style={{ marginBottom: "20px", position: "relative", width: "100%" }}>
                  {/* Previous button */}
                  <button
                    type="button"
                    className="icon-btn btn-sm btn-outline-light mr-2"
                    onClick={handlePreviousClip}
                    disabled={!findPreviousClipPosition()}
                    aria-label="Previous clip"
                    style={{
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      padding: "12px",
                      width: "48px",
                      height: "48px",
                      opacity: !findPreviousClipPosition() ? 0.4 : 1,
                      cursor: !findPreviousClipPosition() ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                      transition: "all 0.3s ease",
                      backdropFilter: "blur(10px)",
                      zIndex: 10,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (findPreviousClipPosition()) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
                        e.currentTarget.style.transform = "scale(1.15)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (findPreviousClipPosition()) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.4)";
                      }
                    }}
                  >
                    <ChevronLeft size={24} color="#000" strokeWidth={2.5} />
                  </button>

                  <div 
                    style={{ 
                      position: "relative", 
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      maxWidth: width500 ? "100%" : "90%",
                      width: width500 ? "100%" : "auto",
                      minWidth: width500 ? "100%" : "450px",
                      height: width500 ? "70vh" : "75vh",
                      minHeight: width500 ? "450px" : "550px",
                      maxHeight: width500 ? "600px" : "800px",
                      overflow: "hidden",
                      borderRadius: "8px",
                      backgroundColor: "#000",
                      margin: "0 auto"
                    }}
                  >
                    {/* Show thumbnail/poster first while video loads */}
                    {isVideoLoading && selectedClip && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#000",
                          zIndex: 5,
                          borderRadius: "8px"
                        }}
                      >
                        <img
                          src={Utils?.generateThumbnailURL(selectedClip)}
                          alt="Video thumbnail"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            opacity: 0.6,
                            borderRadius: "8px"
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "12px",
                            zIndex: 6
                          }}
                        >
                          <div
                            className="spinner-border text-white"
                            role="status"
                            style={{
                              width: "3rem",
                              height: "3rem",
                              borderWidth: "0.3em",
                              borderColor: "rgba(255, 255, 255, 0.3)",
                              borderRightColor: "#fff"
                            }}
                          >
                            <span className="sr-only">Loading...</span>
                          </div>
                          <div style={{ color: "#fff", fontSize: "14px", fontWeight: 500, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                            Loading video...
                          </div>
                        </div>
                      </div>
                    )}
                    <video
                      ref={videoPlayerRef}
                      key={selectedVideo}
                      style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        opacity: isVideoLoading ? 0 : 1,
                        transition: "opacity 0.2s ease",
                        position: "relative",
                        zIndex: 1,
                        display: "block"
                      }}
                      autoPlay={false}
                      controls
                      playsInline
                      preload="metadata"
                      poster={selectedClip ? Utils?.generateThumbnailURL(selectedClip) : undefined}
                      onLoadedMetadata={(e) => {
                        handleVideoLoad(e);
                        setIsVideoLoading(false);
                      }}
                      onLoadedData={() => {
                        setIsVideoLoading(false);
                      }}
                      onCanPlay={() => {
                        setIsVideoLoading(false);
                      }}
                      onWaiting={() => {
                        if (videoPlayerRef.current && !videoPlayerRef.current.paused) {
                          setIsVideoLoading(true);
                        }
                      }}
                      onPlaying={() => {
                        setIsVideoLoading(false);
                      }}
                      onError={() => {
                        setIsVideoLoading(false);
                      }}
                    >
                      <source src={selectedVideo} type="video/mp4" />
                    </video>
                  </div>

                  {/* Next button */}
                  <button
                    type="button"
                    className="icon-btn btn-sm btn-outline-light ml-2"
                    onClick={handleNextClip}
                    disabled={!findNextClipPosition()}
                    aria-label="Next clip"
                    style={{
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      padding: "12px",
                      width: "48px",
                      height: "48px",
                      opacity: !findNextClipPosition() ? 0.4 : 1,
                      cursor: !findNextClipPosition() ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                      transition: "all 0.3s ease",
                      backdropFilter: "blur(10px)",
                      zIndex: 10,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (findNextClipPosition()) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
                        e.currentTarget.style.transform = "scale(1.15)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (findNextClipPosition()) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.4)";
                      }
                    }}
                  >
                    <ChevronRight size={24} color="#000" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Action buttons at bottom */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    paddingTop: "15px",
                    borderTop: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  {/* Delete and Download buttons - shown for all users (students and trainers) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      width: "100%",
                      maxWidth: "400px"
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirmModalOpen(true);
                        setSelectedId(selectedClip?._id);
                      }}
                      style={{
                        border: "none",
                        background: "#ff0000",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        flex: "1",
                        height: "44px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#cc0000"}
                      onMouseLeave={(e) => e.target.style.background = "#ff0000"}
                    >
                      <FaTrash size={14} />
                      <span>Delete</span>
                    </button>
                    <a
                      href={Utils?.generateVideoURL(selectedClip)}
                      download={true}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#007bff",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "14px",
                        fontWeight: 500,
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                        flex: "1",
                        height: "44px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#0056b3"}
                      onMouseLeave={(e) => e.target.style.background = "#007bff"}
                      target="_self"
                    >
                      <FaDownload size={14} />
                      <span>Download</span>
                    </a>
                  </div>
                  
                  {/* Book An Instant Lesson Now button - only for trainees (not trainers) */}
                  {accountType !== "Trainer" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.BOOK_LESSON));
                      }}
                      style={{
                        border: "2px solid #28a745",
                        background: "#28a745",
                        color: "#000000",
                        borderRadius: "6px",
                        padding: "12px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "15px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 8px rgba(40, 167, 69, 0.4)",
                        width: "100%",
                        maxWidth: "400px",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#218838";
                        e.currentTarget.style.borderColor = "#218838";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#28a745";
                        e.currentTarget.style.borderColor = "#28a745";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(40, 167, 69, 0.4)";
                      }}
                    >
                      <span>Book An Instant Lesson Now!</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        }
      />

      {isConfirmModalOpen && (
        <ConfirmModal
          isModelOpen={isConfirmModalOpen}
          setIsModelOpen={setIsConfirmModalOpen}
          selectedId={selectedId}
          deleteFunc={handleDelete}
          closeModal={handleCloseModal}
        />
      )}

      <Modal
        isOpen={isOpenPDF}
        allowFullWidth={true}
        element={
          <>
            <div className="container media-gallery portfolio-section grid-portfolio ">
              <div className="theme-title">
                <div className="media">
                  <div className="media-body media-body text-right">
                    <div className="icon-btn btn-sm btn-outline-light close-apps pointer" onClick={() => { setIsOpenPDF(false) }} > <X /> </div>
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column  align-items-center" style={{ height: "calc(100vh - 81px)" }}>
                <h1 className="p-3">Report</h1>
                <embed src={`${awsS3Url}${reportName}`} width="100%" height="100%" allowfullscreen />
              </div>
              <div className="justify-content-center">
              </div>
            </div>
          </>
        }
      />


      <ReportModal
        currentReportData={currentReportData}
        isOpenReport={isOpenReport}
        setIsOpenReport={setIsOpenReport}
        screenShots={screenShots}
        setScreenShots={setScreenShots}
        reportObj={reportObj}
        setReportObj={setReportObj}
      />
    </div>
  );
};

export default FileSection;
