import axios from "axios";
import {
  createReport,
  cropImage,
  getReport,
  removeImage,
} from "../videoupload/videoupload.api";
import CropImage from "./cropimage";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import CustomModal from "../../common/modal";
import { Crop, Trash2, X } from "react-feather";
import html2canvas from "html2canvas";
import { getS3SignPdfUrl } from "./video.api";
import { useAppSelector, useAppDispatch } from "../../store";
import { authState } from "../auth/auth.slice";
import { values } from "lodash";
import { awsS3Url, notificiationTitles } from "../../../utils/constant";
import { Utils } from "../../../utils/utils";
import Notes from "../practiceLiveExperience/Notes";
import { SocketContext } from "../socket";
import { EVENTS } from "../../../helpers/events";
import "./reportModal.scss";
import { useMediaQuery } from "usehooks-ts";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

const reportModal = ({
  currentReportData,
  isOpenReport,
  setIsOpenReport,
  screenShots,
  setScreenShots,
  reportObj,
  setReportObj,
  isClose,
  isTraineeJoined,
  isCallEnded,
  gamePlanModalNote,
  setGamePlanModalClose,
  isFromCalling
}) => {
  const [isOpenCrop, setIsOpenCrop] = useState(false);
  const [preview, setPreview] = useState(false);
  const [selectImage, setSelectImage] = useState("");
  const [reportArr, setReportArr] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const { userInfo } = useAppSelector(authState);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [pdfFileCurrent, setPdfFileCurrent] = useState();
  const socket = useContext(SocketContext);
  const [loading, setLoading] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showSaveBeforeCloseModal, setShowSaveBeforeCloseModal] = useState(false);

  const demoProfilePic = useRef(null);
  const profilePic = useRef(null);
  const width600 = useMediaQuery('(max-width:600px)')

  const loadImageFromUrl = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result.split(",")[1];
          resolve(`data:image/jpeg;base64,${base64data}`);
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
       
    }
  };

  const getImageBase64 = useMemo(
    () => async (url) => await loadImageFromUrl(url),
    []
  );

  const setImagebase64 = async () => {
    const dpp = await getImageBase64("/assets/images/demoUser.png");
    demoProfilePic.current = dpp;

    const profileUrl = userInfo?.profile_picture;
    if (profileUrl) {
      try {
        const pp = await getImageBase64(Utils?.getImageUrlOfS3(profileUrl));
        profilePic.current = pp;
      } catch (e) {
        profilePic.current = dpp;
      }
    } else {
      profilePic.current = dpp;
    }
  };

  useEffect(() => {
    updateCurrentDate();
    setImagebase64();
  }, []);

  const resetState = () => {
    setScreenShots([]);
    setReportObj({ title: "", topic: "" });
  };

  const updateCurrentDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;
    setCurrentDate(formattedDate);
  };

  useEffect(() => {
    if (currentReportData?.session && isOpenReport) {
      getReportData();
      setUploadPercentage(0);
    }
  }, [currentReportData?.session, isOpenReport]);

  const fetchAndSetScreenShortReport = async (reportData) => {
    var newReportImages = [];
    setLoading(true);
    try {
      if (reportData && reportData?.length > 0) {
        for (let index = 0; index < reportData?.length; index++) {
          const element = reportData[index];
          try {
            const response = await fetch(`${awsS3Url}${element?.imageUrl}`);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result.split(",")[1];
              newReportImages.push({
                ...element,
                imageUrl: `data:image/jpeg;base64,${base64data}`,
              });
              setReportArr([...newReportImages]);
            };
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error("Error fetching or converting image:", error);
          }
        }
      } else {
        setReportArr([...newReportImages]);
      }
    } catch (error) {
       
    } finally {
      setLoading(false);
    }
  };

  const handleCropImage = async (filename, blob) => {
    var res = await cropImage({
      sessions: currentReportData?.session,
      trainer: currentReportData?.trainer,
      trainee: currentReportData?.trainee,
      oldFile: filename,
    });
    if (res?.data?.url) await pushProfilePhotoToS3(res?.data?.url, blob);
    getReportData();
    setIsOpenCrop(false);
    
  };

  async function pushProfilePhotoToS3(presignedUrl, uploadPhoto) {
    const myHeaders = new Headers({ "Content-Type": "image/*" });
    await axios.put(presignedUrl, uploadPhoto, {
      headers: myHeaders,
    });
    return true;
  }

  const getReportData = async () => {
    var res = await getReport({
      sessions: currentReportData?.session,
      trainer: currentReportData?.trainer,
      trainee: currentReportData?.trainee,
    });
    setScreenShots(res?.data?.reportData);
    setReportObj({ title: res?.data?.title, topic: res?.data?.description });
    fetchAndSetScreenShortReport(res?.data?.reportData);
    ;
  };

  const handleRemoveImage = async (filename) => {
    await removeImage({
      sessions: currentReportData?.session,
      trainer: currentReportData?.trainer,
      trainee: currentReportData?.trainee,
      filename: filename,
    });
    getReportData();
    
  };

  const generatePDF = async (content) => {
    html2canvas(content, {
      proxy: "*",
      useCORS: true,
      allowTaint: true,
    }).then(async (canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      var pageWidth = pdf.internal.pageSize.width;
      var aspectRatio = canvas.width / canvas.height;
      var imgHeight = pageWidth / aspectRatio;

      pdf.internal.pageSize.height = imgHeight;
      updateCurrentDate();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      const generatedPdfDataUrl = pdf.output("dataurlstring");
      const byteCharacters = atob(generatedPdfDataUrl.split(",")[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const pdfBlob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });
      const pdfFile = new File([pdfBlob], "generated_pdf.pdf", {
        type: "application/pdf",
      });
      var link = await createUploadLink();
      if (link) pushProfilePDFToS3(link, pdfFile);
    });
  };

  useEffect(() => {
    const content = document.getElementById("report-pdf");
    if (preview && content) {
      generatePDF(content);
    }
  }, [preview]);

  const createUploadLink = async () => {
    var payload = { session_id: currentReportData?.session };
    const data = await getS3SignPdfUrl(payload);
    if (data?.url) return data?.url;
    else return "";
  };

  const pushProfilePDFToS3 = async (presignedUrl, uploadPdf) => {
    try {
      await axios({
        method: "put",
        url: presignedUrl,
        data: uploadPdf,
        headers: { "Content-Type": "application/pdf" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadPercentage(progress === 100 ? 0 : progress);
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const createOrUpdateReport = async () => {
    await createReport({
      sessions: currentReportData?.session,
      trainer: currentReportData?.trainer,
      trainee: currentReportData?.trainee,
      title: reportObj?.title,
      topic: reportObj?.topic,
      reportData: [...screenShots],
    });
  };

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  const handleCloseReport = () => {
    if (isFromCalling) {
      setShowUnsavedChangesModal(true);
    } else {
      closeReport();
    }
  };

  const closeReport = () => {
    setIsOpenReport(false);
    setPreview(false);
    resetState();
    if (isCallEnded) {
      isClose();
    }
  };

  const handleInputChange = (e, field, index = null) => {
    if (index !== null) {
      // For screenshot fields
      screenShots[index][field] = e.target.value;
      setScreenShots([...screenShots]);
    } else {
      // For reportObj fields
      reportObj[field] = e.target.value;
      setReportObj({ ...reportObj });
    }
    
  };

  return (
    <>
      <CustomModal
        isOpen={isOpenReport}
        allowFullWidth={true}
        element={
          <>
            <div
              id="generate-report"
              className="container media-gallery portfolio-section grid-portfolio"
            >
              <div className="theme-title  mb-5">
                <div className="media-body media-body text-right">
                  <div
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={handleCloseReport}
                  >
                    <X />
                  </div>
                </div>
                <div className="media d-flex flex-column  align-items-center">
                  <div>
                    <h2>Report</h2>
                  </div>
                </div>
              </div>
              {preview ? (
                <div className="theme-tab">
                  <div
                    id="report-pdf"
                    style={{
                      padding: "20px ",
                      border: "10px solid #000080",
                      borderColor: "#14328d",
                    }}
                  >
                    <div
                      className="mb-2"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "5px",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          textTransform: "uppercase",
                          margin: "0px",
                          fontWeight: "600",
                          color: "black",
                        }}
                        className="text-md-xl"
                      >
                        Game Plan
                      </p>
                      <div style={{ textAlign: "right" }}>
                        <img
                          className="w-100 netqwix_logo"
                          src="/assets/images/logo/netqwix_logo real.png"
                          alt="Logo"
                          style={{ maxWidth: "200px", objectFit: "contain" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex" }}>
                      <div className="report-meta-data">
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "400",
                            width: "70%",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Date: {currentDate}
                        </div>
                        <h2
                          style={{
                            margin: "0px",
                            fontWeight: "normal",
                            paddingTop: "10px",
                          }}
                        >
                          Topic: {reportObj?.title}
                        </h2>
                        <h2
                          style={{
                            margin: "0px",
                            fontWeight: "normal",
                            color: "black",
                          }}
                        >
                          Name: {reportObj?.topic}
                        </h2>
                      </div>
                    </div>
                    <hr
                      style={{
                        borderWidth: "2px",
                        borderStyle: "solid",
                        borderColor: "black",
                      }}
                    />
                    {reportArr?.map((sst, i) => {
                      return (
                        <>
                          <div className={`d-flex align-items-center ss-data ${width600 ? "flex-column" : "flex-row"}`}>
                            <div className="text-center w-100 w-md-50 pb-3">
                              <img
                              
                                src={sst?.imageUrl}
                                alt="image"
                                style={{
                                  maxHeight: "260px",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                            <div className=" text-md-left w-100 w-md-50">
                              {/* <p style={{ fontSize: '30px', fontWeight: 'normal' }}>{screenShots[i]?.title}</p> */}
                              <p
                                style={{
                                  color: "black",
                                }}
                              >
                                {screenShots[i]?.description}
                              </p>
                            </div>
                          </div>
                          <hr className="border border-dark" />
                        </>
                      );
                    })}
                    {loading && (
                      <div className="my-3 mx-3 h-3">
                        Hang tight, we're loading your images...
                      </div>
                    )}
                    <div
                      className="trainer-data"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ textAlign: "left", marginRight: "20px" }}>
                        <h2 style={{ color: "black" }}>Expert</h2>
                        <p
                          style={{
                            color: "black",
                          }}
                        >
                          {userInfo?.extraInfo?.about}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-nowrap" style={{ color: "black" }}>
                          {userInfo?.fullname}
                        </h2>
                        {/* <img src={userInfo?.profile_picture}
                        alt="John Image"
                        style={{ width: '205.8px', height: '154.4px', marginRight: "20px" }}
                      /> */}

                        <img
                          className="w-100"
                          style={{
                            maxWidth: "205.8px",
                            maxHeight: "205.8px",
                            marginTop: "10px",
                            borderRadius: "8px",
                            objectFit: "contain",
                          }}
                          // crossOrigin="anonymous"
                          // src={Utils?.getImageUrlOfS3(userInfo?.profile_picture) || '/assets/images/demoUser.png'}
                          src={
                            Utils?.getImageUrlOfS3(userInfo?.profile_picture) ||
                            demoProfilePic.current
                          }
                          alt={userInfo?.fullname}
                          onError={(e) => {
                            e.target.src = demoProfilePic.current;
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      paddingTop: "10px",
                    }}
                    className="mb-5"
                  >
                    <Button
                      className="mx-3 px-3 px-sm-5"
                      color="primary"
                      onClick={() => {
                        setPreview(false);
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      className="mx-3 px-3 px-sm-5"
                      color="primary"
                      disabled={uploadPercentage}
                      onClick={() => {
                        createOrUpdateReport();
                        closeReport();
                        sendNotifications({
                          title: notificiationTitles.gamePlanReport,
                          description: `Expert shared the gameplan. Check it in the gameplan tab`,
                          senderId: currentReportData?.trainer,
                          receiverId: currentReportData?.trainee,
                          bookingInfo: null,
                        });
                      }}
                    >
                      {uploadPercentage ? "Loading" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="theme-tab">
                  <div className="row">
                    <div className="col-12 d-flex flex-wrap">
                      <div className="p-2 flex-grow-1">
                        <div className="form-group">
                          <label className="col-form-label">Title</label>
                          <input
                            className="form-control"
                            type="text"
                            name="title"
                            placeholder="Title"
                            onChange={(e) => handleInputChange(e, 'title')}
                            value={reportObj?.title}
                          />
                        </div>
                      </div>
                      <div className="p-2 flex-grow-1">
                        <div className="form-group">
                          <label className="col-form-label">Description</label>
                          <input
                            className="form-control"
                            type="text"
                            name="topic"
                            placeholder="Topic"
                            onChange={(e) => handleInputChange(e, 'topic')}
                            value={reportObj?.topic}
                          />
                        </div>
                      </div>
                    </div>

                    {screenShots?.map((sst, i) => {
                      return (
                        <div className="col-12 d-flex flex-column flex-sm-row flex-wrap p-4 mb-4 shadow-sm border rounded">
                          <div
                            className="border p-2 m-md-2 rounded"
                            style={{ position: "relative", flex: 1 }}
                          >
                            <img
                              style={{
                                width: "100%",
                                height: "100%",
                                maxHeight: "340px",
                                objectFit: "contain",
                              }}
                              src={`${awsS3Url}${sst?.imageUrl}`}
                              alt="Screen Shot"
                            />
                            <div style={{ position: "absolute", bottom: 10 }}>
                              <div
                                className="icon-btn btn-sm btn-outline-light close-apps pointer"
                                onClick={() => {
                                  setSelectImage(sst?.imageUrl);
                                  setIsOpenCrop(true);
                                }}
                              >
                                <Crop />
                              </div>
                            </div>
                          </div>
                          <div className="m-2" style={{ flex: 1 }}>
                            <div className="media-body media-body text-right">
                              <div
                                className="icon-btn btn-sm btn-outline-light close-apps pointer"
                                onClick={() => {
                                  handleRemoveImage(sst?.imageUrl);
                                }}
                              >
                                <Trash2 />
                              </div>
                            </div>
                            <div className="form-group m-0">
                              <label className="col-form-label">
                                Description
                              </label>
                              <textarea
                                rows="4"
                                className="form-control"
                                type="text"
                                name="description"
                                placeholder="Description"
                                onChange={(e) => handleInputChange(e, 'description', i)}
                                value={screenShots[i]?.description}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <label
                    style={{ color: "black", fontWeight: "500" }}
                    className="col-form-label mt-2"
                    htmlFor="account_type"
                  >
                    {uploadPercentage ? (
                      <> Uploading... {uploadPercentage}%</>
                    ) : (
                      <></>
                    )}
                  </label>
                  <div className="d-flex justify-content-center w-100 p-3 mb-5">
                    <Button
                      className="mx-3"
                      color="primary"
                      disabled={uploadPercentage}
                      onClick={() => {
                        setPreview(true);
                      }}
                    >
                      {uploadPercentage ? "Loading" : "Preview"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Unsaved Changes Modal */}
            <Modal
              isOpen={showUnsavedChangesModal}
              toggle={() => setShowUnsavedChangesModal(false)}
            >
              <ModalHeader
                toggle={() => setShowUnsavedChangesModal(false)}
                close={() => <></>}
              >
                Unsaved Changes
              </ModalHeader>
              <ModalBody className="text-center">
                <p>You have unsaved changes. Please preview and save your changes before closing.</p>
              </ModalBody>
              <ModalFooter className="justify-content-center">
                <Button
                  color="primary"
                  className="mx-2"
                  onClick={() => {
                    setShowUnsavedChangesModal(false);
                    setPreview(true);
                  }}
                >
                  Preview
                </Button>
                <Button
                  color="primary"
                  className="mx-2"
                  onClick={() => {
                    createOrUpdateReport();
                    setShowUnsavedChangesModal(false);
                    closeReport();
                  }}
                >
                  Save & Close
                </Button>
              </ModalFooter>
            </Modal>

            {/* Save Before Close Modal */}
            <Modal
              isOpen={showSaveBeforeCloseModal}
              toggle={() => setShowSaveBeforeCloseModal(false)}
            >
              <ModalHeader
                toggle={() => setShowSaveBeforeCloseModal(false)}
                close={() => <></>}
              >
                Save Changes
              </ModalHeader>
              <ModalBody className="text-center">
                <p>You need to save your changes before closing the report.</p>
              </ModalBody>
              <ModalFooter className="justify-content-center">
                <Button
                  color="secondary"
                  className="mx-2"
                  onClick={() => setShowSaveBeforeCloseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  className="mx-2"
                  onClick={() => {
                    createOrUpdateReport();
                    setShowSaveBeforeCloseModal(false);
                    closeReport();
                  }}
                >
                  Save
                </Button>
              </ModalFooter>
            </Modal>

            {gamePlanModalNote && (
              <Notes
                isOpen={gamePlanModalNote}
                onClose={setGamePlanModalClose}
                title={"Game Plans"}
                desc={
                  "Select clips to choose up to two clips, videos will load onto your board when you click the X (cross)."
                }
                style={{
                  top: "10px",
                  left: "10px",
                }}
                triangle={"clip-select"}
                nextFunc={() => {
                  setGamePlanModalClose(false);
                }}
              />
            )}
            <CropImage
              isOpenCrop={isOpenCrop}
              setIsOpenCrop={setIsOpenCrop}
              selectImage={selectImage}
              screenShots={screenShots}
              setScreenShots={setScreenShots}
              handleCropImage={handleCropImage}
            />
          </>
        }
      />
    </>
  );
};

export default reportModal;