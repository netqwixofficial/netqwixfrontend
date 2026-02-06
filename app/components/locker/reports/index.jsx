import { useEffect, useState } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { useAppDispatch, useAppSelector } from "../../../../app/store";
import { videouploadAction, videouploadState } from "../../../../app/components/videoupload/videoupload.slice";
import { authAction, authState } from "../../../../app/components/auth/auth.slice";
import { deleteReports, deleteSavedSession, myClips, reports, traineeClips } from "../../../../containers/rightSidebar/fileSection.api";
import { AccountType, LOCAL_STORAGE_KEYS } from "../../../common/constants";
import Modal from "../../../common/modal";
import ReportModal from "../../../../app/components/video/reportModal";
import { X } from "react-feather";
import { Utils } from "../../../../utils/utils";
import { awsS3Url } from "../../../../utils/constant";
import { getAllSavedSessions } from "../../videoupload/videoupload.api";
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { Tooltip } from "react-tippy";
import { FaDownload, FaTrash } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import '../../trainer/dashboard/index.scss';
import ConfirmModal from "../my-clips/confirmModal";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Spinner } from "reactstrap";
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import ReportsSkeleton from "../../common/ReportsSkeleton";

const getReportDownloadName = (reportPath) => {
  if (!reportPath || typeof reportPath !== "string") {
    return "report.pdf";
  }
  const parts = reportPath.split("/");
  const fileName = parts[parts.length - 1];
  return fileName || "report.pdf";
};

const Reports = ({ activeCenterContainerTab, trainee_id }) => {
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
  const [reportsData, setReportsData] = useState([]);
  const [isOpenPDF, setIsOpenPDF] = useState(false);
  const [reportName, setReportName] = useState("");
  const [isOpenReport, setIsOpenReport] = useState(false);
  const { sidebarLockerActiveTab, accountType } = useAppSelector(authState);
  const [currentReportData, setCurrentReportData] = useState({})

  const [isOpenPlayVideo, setIsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [videoDimensions, setVideoDimensions] = useState({ width: "470px", height: "587px" });
  const [reportObj, setReportObj] = useState({ title: "", topic: "" });
  const [screenShots, setScreenShots] = useState([]);
  const [isConfirmModalOpen , setIsConfirmModalOpen] = useState(false)
  const [selectedReportId , setSelectedReportId] = useState(null);
  const [selectedRecordingId , setselectedRecordingId] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(false);
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

    // Set width and height based on aspect ratio
    if (aspectRatio > 1) {
      setVideoDimensions({ width: "100%", height: "70%" });
    } else {
      setVideoDimensions({ width: "470px", height: "587px" });
    }
  };

  useEffect(() => {
    if (!isOpen && activeCenterContainerTab === 'gamePlans') getMyClips()
  }, [isOpen, activeCenterContainerTab])

  // Reset PDF loading state when modal closes
  useEffect(() => {
    if (!isOpenPDF) {
      setIsLoadingPDF(false);
      setPdfError(false);
      setReportName("");
    }
  }, [isOpenPDF])

  function extractDateParts(dateString) {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }

  const getMyClips = async () => {
    setIsLoadingData(true);
    try {
      var res3
      if (trainee_id) {
        res3 = await reports({ trainee_id })
      } else {
        res3 = await reports({})
      }
      const savedSessions = await getAllSavedSessions()
      const organizedData = savedSessions.data.reduce((acc, obj) => {
        const createdAtDate = extractDateParts(obj.createdAt);
        const key = `${createdAtDate.year}-${createdAtDate.month}-${createdAtDate.day}`;

        if (!acc[key]) {
          acc[key] = {
            _id: {
              year: createdAtDate.year,
              month: createdAtDate.month,
              day: createdAtDate.day
            },
            report: [],
            date: new Date(obj.createdAt)
          };
        }

        acc[key].report.push(obj);

        return acc;
      }, {});

      const result = Object.values(organizedData).map(item => ({
        ...item,
        show: true,
      }));

      var temp = res3?.result

      temp = temp.map(vl => {
        return { ...vl, show: true, date: vl?.report?.length ? new Date(vl?.report[0]?.createdAt) : new Date() }
      });

      // setReportsData([...result, ...temp])

      const groupedReports = {};

      [...result, ...temp]?.forEach((item) => {
        const { _id, report, ...rest } = item;

        const idString = JSON.stringify(_id);

        if (groupedReports[idString]) {

          groupedReports[idString].report.push(...report);
        } else {

          groupedReports[idString] = { _id, report, ...rest };
        }
      });

      const mergedData = Object.values(groupedReports);

      setReportsData(mergedData?.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports. Please try again.");
    } finally {
      setIsLoadingData(false);
    }
  }
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate() < 10 ? date.getDate() : `0${date.getDate()}`;
    const month = (date.getMonth() + 1) < 10 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`;
    const formattedDate = `${day}/${month}/${date.getFullYear()}`;
    return formattedDate;
  }

  const handleSessionDelete = async (id) => {
    const res = await deleteSavedSession({id});
    if(res?.success){
      await getMyClips();
      toast.success(res?.message);
      setIsConfirmModalOpen(false);
      setselectedRecordingId(null);
    (null);
    }else{
      toast.error(res?.message);
    }
  };
  const handleReportDelete = async (id) => {
    const res = await deleteReports({id});
    if(res?.result?.code === 200){
    await getMyClips();
    toast.success(res?.result?.msg);
    setIsConfirmModalOpen(false);
    setSelectedReportId(null);
    }else{
      toast.error(res?.result?.msg);
    }
  };

  const handleCloseModal = () =>{
    setIsConfirmModalOpen(false)
    setSelectedReportId(null)
    setselectedRecordingId(null)
  }

  // Initialize PDF viewer plugin with toolbar
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [],
  });

  const handlePdfLoadSuccess = (e) => {
    setIsLoadingPDF(false);
    setPdfError(false);
  };

  const handlePdfLoadError = (error) => {
    setIsLoadingPDF(false);
    setPdfError(true);
    console.error("PDF loading error:", error);
  };

  return (
    <>
      {/* <ToastContainer /> */}
    <div className="media-gallery portfolio-section grid-portfolio">
      {isLoadingData ? (
        <ReportsSkeleton />
      ) : reportsData?.length ? reportsData?.map((cl, ind) =>
        <div className={`collapse-block ${!cl?.show ? "" : "open"}`} key={ind}>
          <h5
            className="block-title"
            onClick={() => {
              // Toggle visibility of block
            }}
          >
            <label className="badge badge-primary sm ml-2">{`${cl?._id?.month}/${cl?._id?.day}/${cl?._id?.year}`}</label>
          </h5>
          <div className={`block-content ${!cl?.show ? "d-none" : "d-flex flex-wrap"}`}>
            {/* Render videos with session data */}
            {cl?.report.map((clp, index) => {
              // return  !clp.reportData ?
              return clp.hasOwnProperty("reportData") ?
                <div className={`col-6 col-sm-4`} key={index} style={{ whiteSpace: "nowrap" }}>
                  {/* Render video */}
                  <div className="text-wrap">
                    <div style={{ textAlign: "center" }}>
                      <dd>GAME PLAN with 
                        <div>
                        <strong>{clp?.[accountType === AccountType?.TRAINER ? "trainee" : "trainer"]?.fullname}</strong>
                        </div>
                        </dd>
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                      <dd
                        className="video-container2"
                        style={{ cursor: "pointer", textAlign: "center" }}
                        onClick={async () => {
                          if (accountType === "Trainer") {
                            setCurrentReportData({ session: clp?.session?._id, trainer: clp?.trainer?._id, trainee: clp?.trainee?._id })
                            setIsOpenReport(true)
                          } else {
                            setIsLoadingPDF(true);
                            setPdfError(false);
                            setIsOpenPDF(true)
                            setReportName(clp?.session?.report)
                          }
                        }}
                      >
                        {/* Show first image from game plan if available */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "12px 8px",
                            minHeight: "120px",
                          }}
                        >
                          {clp?.reportData && Array.isArray(clp.reportData) && clp.reportData.length > 0 && clp.reportData[0]?.imageUrl ? (
                            <img
                              src={awsS3Url + clp.reportData[0].imageUrl}
                              alt="Game Plan Preview"
                              style={{ 
                                width: "100%", 
                                height: "120px", 
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "2px solid #e0e0e0",
                                marginBottom: "4px"
                              }}
                              onError={(e) => {
                                e.target.src = "/icons/FileSee.png";
                                e.target.style.width = "40px";
                                e.target.style.height = "40px";
                                e.target.style.objectFit = "contain";
                              }}
                            />
                          ) : (
                            <img
                              src="/icons/FileSee.png"
                              alt="FileSee Icon"
                              style={{ width: "40px", height: "40px", marginBottom: "4px" }}
                            />
                          )}
                          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                            View Game Plan
                          </span>
                          <div
                            className="download-delete"
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "12px",
                              marginTop: "4px",
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsConfirmModalOpen(true);
                                setSelectedReportId(clp?._id);
                              }}
                              style={{
                                cursor: "pointer",
                                color: "#dc3545",
                                fontSize: "16px",
                              }}
                            >
                              <FaTrash />
                            </div>
                            <div>
                              {clp?.session?.report && (
                                <a
                                  href={awsS3Url + clp.session.report}
                                  download={getReportDownloadName(clp.session.report)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    color: "#007bff",
                                    fontSize: "16px",
                                  }}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <FaDownload />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </dd>
                    </div>
                  </div>
                </div>
                :
                <div className={`col-4`} key={index} style={{ whiteSpace: "nowrap" }}>
                  <div
                  // style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                  >
                    <div style={{
                      wordBreak: 'break-all'
                    }}>
                      <dd>SESSION RECORDING with
                        <div style={{ textAlign: "center" }}>
                          <strong>{accountType === "Trainer" ? clp?.trainee_name : clp?.trainer_name} </strong>
                        </div>
                      </dd>
                    </div>

                    <div style={{ marginBottom: "5px" }}>
                      <dd
                        className="ml-3 video-container2"
                        style={{ cursor: "pointer", textAlign: "center" }}
                        onClick={() => {
                          setSelectedVideo(Utils?.generateVideoURL(clp))
                          setIsOpen(true)
                        }}
                      >
                        <video
                          id="Home-page-vid"
                          // width="160px"
                          // height="80px"
                          style={{
                            padding: "2px",
                            position : 'relative',
                            // maxWidth: "250px",
                            aspectRatio:"1/1",
                            // width: "auto",
                            // height: "auto",
                            width: "100%",
                            border: "4px solid #b4bbd1",
                            borderRadius: "5px",
                            objectFit: "cover"
                          }}
                        >
                          <source src={Utils?.generateVideoURL(clp)} type="video/webm" />
                        </video>
                        <div
                            className="download-delete"
                            style={{
                              position: "absolute",
                              top: "23.5%" ,
                              right:"7.5% ",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              backgroundColor: "#333",
                              color: "#fff",
                              padding: "8px",
                              fontSize : "16px",
                              zIndex : '8'
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                // handleSessionDelete(clp?._id);
                                setIsConfirmModalOpen(true);
                                setselectedRecordingId(clp?._id);
                              }}
                              style={{
                                margin : '3px auto',
                                cursor : 'pointer'

                              }}
                            >
                              <FaTrash />
                            </div>
                            <div
                            style={{
                                margin : '3px auto'
                              }}
                            >
                              <a
                                href={Utils?.generateVideoURL(clp)}
                                download={true}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  color : '#fff',
                                  fontSize : '16px'
                                }}
                                target="_self"
                              >
                                <FaDownload />
                              </a>
                            </div>
                          </div>
                      </dd>
                    </div>

                  </div>
                </div>
            })}
          </div>
        </div>
      ) :
        <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
          <h5 className="block-title">No Data Found</h5>
        </div>}


      <Modal
        isOpen={isOpenPDF}
        allowFullWidth={true}
        element={
          <>
            <div style={{ 
              width: "100%", 
              height: "100vh", 
              display: "flex", 
              flexDirection: "column",
              backgroundColor: "#f5f5f5"
            }}>
              {/* Header */}
              <div style={{
                padding: "15px 20px",
                backgroundColor: "#fff",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: "1.5rem", 
                  fontWeight: 600,
                  color: "#333"
                }}>
                  Game Plan Report
                </h2>
                <div 
                  className="icon-btn btn-sm btn-outline-light close-apps pointer" 
                  onClick={() => { 
                    setIsOpenPDF(false);
                    setIsLoadingPDF(false);
                    setPdfError(false);
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#f0f0f0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e0e0e0"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                >
                  <X size={20} />
                </div>
              </div>

              {/* PDF Viewer Container */}
              <div style={{ 
                flex: 1, 
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#525252",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                {isLoadingPDF && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    zIndex: 10,
                    gap: "20px"
                  }}>
                    <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
                    <h5 style={{ color: "#666", margin: 0 }}>Loading PDF...</h5>
                  </div>
                )}
                
                {pdfError && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#fff",
                    zIndex: 10,
                    gap: "15px",
                    padding: "20px"
                  }}>
                    <div style={{ fontSize: "3rem" }}>⚠️</div>
                    <h5 style={{ color: "#d32f2f", margin: 0, textAlign: "center" }}>
                      Failed to load PDF
                    </h5>
                    <p style={{ color: "#666", textAlign: "center", margin: 0 }}>
                      The PDF file could not be loaded. Please try again later.
                    </p>
                    <button
                      onClick={() => {
                        setPdfError(false);
                        setIsLoadingPDF(true);
                        // Force re-render by toggling modal
                        setIsOpenPDF(false);
                        setTimeout(() => {
                          setIsOpenPDF(true);
                        }, 100);
                      }}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#1976d2",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div style={{ 
                  width: "100%", 
                  height: "100%",
                  maxWidth: "100%",
                  overflow: "auto"
                }}>
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer 
                      fileUrl={`${awsS3Url}${reportName}`}
                      plugins={[defaultLayoutPluginInstance]}
                      onDocumentLoad={handlePdfLoadSuccess}
                      renderError={(error) => {
                        handlePdfLoadError(error);
                        return (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            color: "#d32f2f",
                            padding: "20px"
                          }}>
                            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>⚠️</div>
                            <p style={{ textAlign: "center" }}>Error loading PDF: {error?.message || "Unknown error"}</p>
                          </div>
                        );
                      }}
                      renderLoader={(percentages) => (
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100%",
                          gap: "20px"
                        }}>
                          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
                          <div style={{ color: "#666" }}>
                            Loading PDF... {percentages}%
                          </div>
                        </div>
                      )}
                    />
                  </Worker>
                </div>
              </div>
            </div>
          </>
        }
      />

      <Modal
        isOpen={isOpenPlayVideo}
        // allowFullWidth={true}
        element={
          <>
            <div className="d-flex flex-column align-items-center p-3 justify-content-center h-100">
              <div
                style={{ borderRadius: 5 }}
              >
                <div className="media-body media-body text-right">
                  <div
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <X />
                  </div>
                </div>

                {/* <MediaPlayer title="Sprite Fight" style={videoDimensions} src={selectedVideo}>
                  <MediaProvider />
                  <DefaultVideoLayout thumbnails="https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/storyboard.vtt" icons={defaultLayoutIcons} />
                </MediaPlayer> */}
                <video
                  style={videoDimensions}
                  autoPlay
                  controls
                  onLoadedData={handleVideoLoad}
                >
                  <source src={selectedVideo} type="video/webm" />
                </video>
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
    {
      isConfirmModalOpen && 
      (
        <ConfirmModal
        isModelOpen={isConfirmModalOpen}
        setIsModelOpen={setIsConfirmModalOpen}
        selectedId = {selectedReportId || selectedRecordingId}
        deleteFunc={selectedReportId ? handleReportDelete : handleSessionDelete}
        closeModal = {handleCloseModal}
       />
      )
    }
    </>
  )
}

export default Reports