import { Edit2, RefreshCw, X, Type } from "react-feather";
import Image from "next/image";
import { SketchPicker } from "react-color";
import { useEffect, useState } from "react";
import { Popover } from "react-tiny-popover";
import { SHAPES } from "../../common/constants";
import Modal from "../../common/modal";
import {
  Nav,
  NavLink,
  NavItem,
  TabContent,
  TabPane,
  Col,
  Button,
} from "reactstrap";
import {
  myClips,
  traineeClips,
} from "../../../containers/rightSidebar/fileSection.api";
import { Tooltip } from "react-tippy";
import { Utils } from "../../../utils/utils";
import Notes from "../practiceLiveExperience/Notes";
import { isIOS } from "react-device-detect";
import { useMediaQuery } from "usehooks-ts";
import { RxAngle } from "react-icons/rx";

export const CanvasMenuBar = ({
  isOpen,
  setIsOpen,
  canvasConfigs,
  sketchPickerColor,
  setSketchPickerColor,
  undoDrawing,
  refreshDrawing,
  setCanvasConfigs,
  drawShapes,
  selectedClips,
  setSelectedClips,
  toUser,
  isCanvasMenuNoteShow,
  setIsCanvasMenuNoteShow,
  setMicNote,
  setClipSelectNote,
  clipSelectNote,
  setCountClipNoteOpen,
  resetInitialPinnedUser,
  isFromPotrait,
  isFullScreen
}) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [displayLineWidthPicker, setDisplayLineWidthPicker] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [videoActiveTab, setAideoActiveTab] = useState("media");
  const [clips, setClips] = useState([]);
  const [traineeClip, setTraineeClips] = useState([]);
  const [selectClips, setSelectClips] = useState([]);
  const [colorNote, setColorNote] = useState(false);
  const [pencilNote, setPencilNote] = useState(false);
  const [lineNote, setLineNote] = useState(false);
  const [circleNote, setCircleNote] = useState(false);
  const [squareNote, setSquareNote] = useState(false);
  const [rectangleNote, setRectangleNote] = useState(false);
  const [ovalNote, setOvalNote] = useState(false);
  const [triangleNote, setTriangleNote] = useState(false);
  const [arrowRightNote, setArrowRightNote] = useState(false);
  const [twoSideArrowNote, setTwoSideArrowNote] = useState(false);
  const [undoNote, setUndoNote] = useState(false);
  const [refreshNote, setRefreshNote] = useState(false);
  useEffect(() => {
    if (isOpen) {
      getMyClips();
    }
  }, [isOpen]);

  const getMyClips = async () => {
    var res = await myClips({});
    setClips(res?.data);
    var res2 = await traineeClips({});
    var arr = res2?.data || [];
    for (let index = 0; index < arr?.length; index++) {
      var el = arr[index]?.clips;
      arr[index].clips = [
        ...new Map(el.map((item) => [item.clips._id, item])).values(),
      ];
    }
    setTraineeClips(arr);
  };
  const isMobileScreen = useMediaQuery("(max-width: 1000px)");
  const isSmallScreen = useMediaQuery("(max-width: 410px)");

  var netquixVideos = [
    {
      _id: "656acd81cd2d7329ed0d8e91",
      title: "Dog Activity",
      category: "Acting",
      user_id: "6533881d1e8775aaa25b3b6e",
      createdAt: "2023-12-02T06:24:01.995Z",
      updatedAt: "2023-12-02T06:24:01.995Z",
      file_name: "1717589251977.mp4",
      __v: 0,
    },
    {
      _id: "657053c4c440a4d0d775e639",
      title: "Pupppy clip",
      category: "Golf",
      user_id: "64ad7aae6d668be38e53be1b",
      createdAt: "2023-12-06T10:58:12.080Z",
      updatedAt: "2023-12-06T10:58:12.080Z",
      file_name: "1718140110745.quicktime",
      __v: 0,
    },
  ];

  const menuSelector = (shapeType) => {
    if (shapeType !== activeTab) {
      drawShapes(shapeType);
      setActiveTab(shapeType);
    } else {
      drawShapes(null);
      setActiveTab(null);
    }
  }
   
  return (
    <div style={{ margin: isFromPotrait ? "0.5rem" : "1rem", display: "flex", justifyContent: "center" }}>
      <div
        className="creationBarItem "
        style={{
          width: (isSmallScreen &&isFullScreen)  ? "222px" : "auto"
        }}
      // style={mediaQuery.matches ? { width: 52 } : { width: "100%" }}
      >
        <div className="CreationBarCustomizable" style={{ overflow: 'auto', display: isFromPotrait ? "flex" : "block" }}>

          {/* free hand */}
          <Popover
            className="color-picker-popover"
            isOpen={displayColorPicker}
            positions={["left", "right"]} // if you'd like, you can limit the positions
            padding={10} // adjust padding here!
            reposition={true} // prevents automatic readjustment of content position that keeps your popover content within its parent's bounds
            onClickOutside={() => setDisplayColorPicker(false)} // handle click events outside of the popover/target here!
            content={(
              { position, nudgedLeft, nudgedTop } // you can also provide a render function that injects some useful stuff!
            ) => (
              <div>
                <SketchPicker
                  onChange={(color) => {
                    const payload = {
                      ...canvasConfigs,
                      sender: {
                        ...canvasConfigs.sender,
                        strokeStyle: color.hex,
                      },
                    };
                    setCanvasConfigs(payload);
                    canvasConfigs = payload;
                    // canvasConfigs.sender.strokeStyle = color.hex;
                    setSketchPickerColor(color.rgb);
                  }}
                  color={sketchPickerColor}
                />
              </div>
            )}
          >
            <div
              className="icon-btn  button-effect btn-sm"
              onClick={() => {
                setDisplayColorPicker((prevVal)=>!prevVal);
              }}
              style={{
                height: "24px",
                width: "24px",
                padding: isSmallScreen ? "12px" : "5px",
                margin: "5px",
                marginLeft: "2px",
              }}
            >
              <Image
                src="/icons/color-wheel.png"
                width={20}
                height={20}
                alt="color-picker"
              />
            </div>
          </Popover>

          {/* Line Width Picker */}
          <Popover
            className="line-width-picker-popover"
            isOpen={displayLineWidthPicker}
            positions={["left", "right"]}
            padding={10}
            reposition={true}
            onClickOutside={() => setDisplayLineWidthPicker(false)}
            content={() => (
              <div style={{ padding: "10px", background: "white", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <div style={{ marginBottom: "8px", fontWeight: "bold", fontSize: "12px" }}>Line Width</div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={canvasConfigs?.sender?.lineWidth || 3}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value);
                    const payload = {
                      ...canvasConfigs,
                      sender: {
                        ...canvasConfigs.sender,
                        lineWidth: newWidth,
                      },
                    };
                    setCanvasConfigs(payload);
                    canvasConfigs = payload;
                  }}
                  style={{ width: "150px" }}
                />
                <div style={{ textAlign: "center", marginTop: "4px", fontSize: "11px" }}>
                  {canvasConfigs?.sender?.lineWidth || 3}px
                </div>
              </div>
            )}
          >
            <div
              className="icon-btn  button-effect btn-sm"
              onClick={() => {
                setDisplayLineWidthPicker((prevVal) => !prevVal);
              }}
              style={{
                height: "24px",
                width: "24px",
                padding: isSmallScreen ? "12px" : "5px",
                margin: "5px",
                marginLeft: "2px",
              }}
              title="Line Width"
            >
              <div style={{ 
                width: "12px", 
                height: `${Math.max(2, (canvasConfigs?.sender?.lineWidth || 3) / 2)}px`, 
                background: canvasConfigs?.sender?.strokeStyle || "#000",
                borderRadius: "2px",
                margin: "auto"
              }} />
            </div>
          </Popover>
          {/* Text Tool */}
          <div
            className={`icon-btn  button-effect btn-sm ${SHAPES.TEXT === activeTab
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",
              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.TEXT)
            }}
            title="Add Text Annotation"
          >
            <Type height={18} width={18} style={{minWidth:"12px"}}/>
          </div>

          {/* Free Hand Tool */}
          <div
            className={`icon-btn  button-effect btn-sm ${SHAPES.FREE_HAND === activeTab
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.FREE_HAND)
            }}
            title="Free Hand Drawing"
          >
            <Edit2 height={20} width={20} style={{minWidth:"12px"}}/>
          </div>

          {/* line */}

          <div
            className={`icon-btn  button-effect btn-sm ${SHAPES.ANGLE === activeTab
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.ANGLE)
            }}
          >
            <Image src="/icons/angle.png" width={15} height={15} alt="angle" />

          </div>

          <div
            className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.LINE
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.LINE)

            }}
          >
            <Image src="/icons/line.png" width={20} height={20} alt="line" />
          </div>

          {/* circle */}

          <div
            className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.CIRCLE
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.CIRCLE)
            }}
          >
            <i className="fa fa-circle-thin" />
          </div>

          {/* square */}

          <div
            className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.SQUARE
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
            onClick={() => {
              menuSelector(SHAPES.SQUARE)
            }}
          >
            <i className="fa fa-square-o" />
          </div>

          {/* Arrow Tools */}
          <div
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",
              margin: "5px",
              marginLeft: "2px",
            }}
            className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.ARROW_RIGHT
              ? "btn-outline-primary"
              : "btn-outline-light"
              }`}
            onClick={() => {
              menuSelector(SHAPES.ARROW_RIGHT)
            }}
            title="Right Arrow"
          >
            <i className="fa fa-long-arrow-right" />
          </div>
          
          {!isMobileScreen && (
            <>
              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.ARROW_UP
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.ARROW_UP)
                }}
                title="Up Arrow"
              >
                <i className="fa fa-long-arrow-up" />
              </div>
              
              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.ARROW_DOWN
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.ARROW_DOWN)
                }}
                title="Down Arrow"
              >
                <i className="fa fa-long-arrow-down" />
              </div>
              
              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.ARROW_LEFT
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.ARROW_LEFT)
                }}
                title="Left Arrow"
              >
                <i className="fa fa-long-arrow-left" />
              </div>
            </>
          )}

          {!isMobileScreen &&
            <>
              {/* rectangle */}

              <div
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.RECTANGLE
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.RECTANGLE)
                }}
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",

                  margin: "5px",
                  marginLeft: "2px",
                }}
              >
                <Image
                  src="/icons/rectangle.png"
                  width={20}
                  height={20}
                  alt="rectangle"
                />
              </div>

              {/* oval */}

              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.OVAL
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.OVAL)
                }}
              >

                <Image src="/icons/oval.png" width={20} height={20} alt="oval" />
              </div>

              {/* triangle */}

              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.TRIANGLE
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.TRIANGLE)
                }}
              >
                <Image
                  src="/icons/triangle.png"
                  width={20}
                  height={20}
                  alt="triangle"
                />
              </div>

              {/* arrows */}





              <div
                style={{
                  height: "24px",
                  width: "24px",
                  padding: isSmallScreen ? "12px" : "5px",
                  margin: "5px",
                  marginLeft: "2px",
                }}
                className={`icon-btn  button-effect btn-sm ${activeTab === SHAPES.TWO_SIDE_ARROW
                  ? "btn-outline-primary"
                  : "btn-outline-light"
                  }`}
                onClick={() => {
                  menuSelector(SHAPES.TWO_SIDE_ARROW)
                }}
              >
                <i className="fa fa-arrows-v rotate-90" />
              </div>

            </>}
          {undoDrawing &&

            <div
              className={`icon-btn  button-effect btn-sm`}
              onClick={undoDrawing}
              style={{
                height: "24px",
                width: "24px",
                padding: isSmallScreen ? "12px" : "5px",

                margin: "5px",
                marginLeft: "2px",
              }}
            >
              <Image src="/icons/undo.png" width={20} height={20} alt="Undo" style={{ height: isMobileScreen ? "16px" : "none" }} />
            </div>
          }

          <div
            className={`icon-btn  button-effect btn-sm`}
            onClick={refreshDrawing}
            style={{
              height: "24px",
              width: "24px",
              padding: isSmallScreen ? "12px" : "5px",

              margin: "5px",
              marginLeft: "2px",
            }}
          >
            <RefreshCw height={20} width={20} style={{minWidth:"12px"}}/>
          </div>

          {/* <span>
            <div
              className={`icon-btn  button-effect btn-sm`}
              onClick={() => { setIsOpen(true) }}
            >
              <i className="fa fa-film" />
            </div>
          </span> */}
        </div>
      </div>
      {isCanvasMenuNoteShow && (
        <Notes
          isOpen={isCanvasMenuNoteShow}
          onClose={setIsCanvasMenuNoteShow}
          title={"Tool Bar"}
          desc={"Provides various tools for editing and manipulating the canvas."}
          style={{
            top: "-4px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setIsCanvasMenuNoteShow(false);
            setColorNote(true);
          }}
        />
      )}
      {colorNote && (
        <Notes
          isOpen={colorNote}
          onClose={setColorNote}
          title={"Color Picker"}
          desc={"Select the color you need for your drawing."}
          style={{
            top: "10px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setColorNote(false);
            setPencilNote(true);
          }}
        />
      )}
      {pencilNote && (
        <Notes
          isOpen={pencilNote}
          onClose={setPencilNote}
          title={"Pencil"}
          desc={"Use this to draw freehand."}
          style={{
            top: "65px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setPencilNote(false);
            setLineNote(true);
          }}
        />
      )}
      {lineNote && (
        <Notes
          isOpen={lineNote}
          onClose={setLineNote}
          title={"Line"}
          desc={"Draw a straight line easily"}
          style={{
            top: "108px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setLineNote(false);
            setCircleNote(true);
          }}
        />
      )}
      {circleNote && (
        <Notes
          isOpen={circleNote}
          onClose={setCircleNote}
          title={"Circle"}
          desc={"Create perfect circles effortlessly."}
          style={{
            top: "150px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setCircleNote(false);
            setSquareNote(true);
          }}
        />
      )}
      {squareNote && (
        <Notes
          isOpen={squareNote}
          onClose={setSquareNote}
          title={"Square"}
          desc={"Draw perfect squares with this tool."}
          style={{
            top: "195px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setSquareNote(false);
            setRectangleNote(true);
          }}
        />
      )}
      {rectangleNote && (
        <Notes
          isOpen={rectangleNote}
          onClose={setRectangleNote}
          title={"Rectangle"}
          desc={"Draw rectangles easily with this tool."}
          style={{
            top: "240px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setRectangleNote(false);
            setOvalNote(true);
          }}
        />
      )}
      {ovalNote && (
        <Notes
          isOpen={ovalNote}
          onClose={setOvalNote}
          title={"Oval"}
          desc={"Create oval shapes effortlessly."}
          style={{
            top: "285px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setOvalNote(false);
            setTriangleNote(true);
          }}
        />
      )}
      {triangleNote && (
        <Notes
          isOpen={triangleNote}
          onClose={setTriangleNote}
          title={"Triangle"}
          desc={"Make triangles with precision."}
          style={{
            top: "330px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setTriangleNote(false);
            setArrowRightNote(true);
          }}
        />
      )}
      {arrowRightNote && (
        <Notes
          isOpen={arrowRightNote}
          onClose={setArrowRightNote}
          title={"Right Arrow"}
          desc={"Easily draw arrows to point things out."}
          style={{
            top: "375px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setArrowRightNote(false);
            setTwoSideArrowNote(true);
          }}
        />
      )}
      {twoSideArrowNote && (
        <Notes
          isOpen={twoSideArrowNote}
          onClose={setTwoSideArrowNote}
          title={"Two Sided Arrow"}
          desc={"Use this to create bidirectional arrows."}
          style={{
            top: "418px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setTwoSideArrowNote(false);
            setUndoNote(true);
          }}
        />
      )}
      {undoNote && (
        <Notes
          isOpen={undoNote}
          onClose={setUndoNote}
          title={"Undo"}
          desc={"Step back if you make a mistake."}
          style={{
            top: "460px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setUndoNote(false);
            setRefreshNote(true);
          }}
        />
      )}
      {refreshNote && (
        <Notes
          isOpen={refreshNote}
          onClose={setRefreshNote}
          title={"Reset"}
          desc={"Reset clears the canvas and restores it to its original state."}
          style={{
            top: "505px",
            left: "90px",
          }}
          triangle={"triangle-left"}
          nextFunc={() => {
            setRefreshNote(false);
            setMicNote(true);
          }}
        />
      )}

      {/* ------------------------------ ------------------ -----------------------------*/}

      <Modal
        isOpen={isOpen}
        element={
          <>
            <div className="container media-gallery portfolio-section grid-portfolio">
              <div className="theme-title  mb-5">
                <div className="media-body media-body text-right">
                  <div
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={() => {
                      if (selectClips && selectClips?.length) {
                        setSelectedClips(selectClips);
                        setClipSelectNote(false);
                        resetInitialPinnedUser()
                      }
                      setIsOpen(false);
                    }}
                  >
                    <X />
                  </div>
                </div>
                <div className="media d-flex flex-column  align-items-center">
                  <div>
                    <h2>Select 2 clips to share with {toUser?.fullname}</h2>
                  </div>
                </div>
              </div>
              <div className="theme-tab">
                <Nav tabs className="justify-content-around">
                  <NavItem className="ml-5px  mt-2">
                    <NavLink
                      className={`button-effect ${videoActiveTab === "media" ? "active" : ""
                        } select-clip-width`}
                      onClick={() => setAideoActiveTab("media")}
                    >
                      My Clips
                    </NavLink>
                  </NavItem>
                  <NavItem className="ml-5px  mt-2">
                    <NavLink
                      className={`button-effect ${videoActiveTab === "trainee" ? "active" : ""
                        } select-clip-width`}
                      onClick={() => setAideoActiveTab("trainee")}
                    >
                      Enthusiasts
                    </NavLink>
                  </NavItem>
                  <NavItem className="ml-5px  mt-2">
                    <NavLink
                      className={`button-effect ${videoActiveTab === "docs" ? "active" : ""
                        } select-clip-width`}
                      onClick={() => setAideoActiveTab("docs")}
                    >
                      NetQwix
                    </NavLink>
                  </NavItem>
                </Nav>
              </div>
              <div className="file-tab">
                <TabContent
                  activeTab={videoActiveTab}
                  className="custom-scroll"
                >
                  <TabPane tabId="media">
                    <div className="media-gallery portfolio-section grid-portfolio">
                      {clips?.length ? (
                        clips?.map((cl, ind) => (
                          <div className={`collapse-block open`}>
                            <h5
                              className="block-title"
                              onClick={() => {
                                var temp = clips;
                                temp = temp.map((vl) => {
                                  return { ...vl, show: false };
                                });
                                temp[ind].show = true;
                                setClips([...temp]);
                              }}
                            >
                              {cl?._id}
                              <label className="badge badge-primary sm ml-2">
                                {cl?.clips?.length}
                              </label>
                            </h5>
                            {/*  NORMAL  STRUCTURE END  */}
                            <div className={`block-content`}>
                              <div className="row" style={{ margin: 0 }}>
                                {cl?.clips.map((clp, index) => {
                                  var sld = selectClips.find(
                                    (val) => val?._id === clp?._id
                                  );
                                  return (
                                    <div
                                      key={index}
                                      className={`col-3 p-1`}
                                      style={{ borderRadius: 5 }}
                                      onClick={() => {
                                        if (!sld && selectClips?.length < 2) {
                                          selectClips.push(clp);
                                          setSelectClips([...selectClips]);
                                        } else {
                                          var temp = JSON.parse(
                                            JSON.stringify(selectClips)
                                          );
                                          temp = temp.filter(
                                            (val) => val._id !== clp?._id
                                          );
                                          setSelectClips([...temp]);
                                        }
                                      }}
                                    >
                                      <video
                                        poster={Utils?.generateThumbnailURL(clp)}
                                        style={{
                                          // border: `${sld ? "2px" : "0px"} solid green`,
                                          // width: "98%",
                                          // maxHeight: "150px",
                                          // height: "100%",
                                          marginBottom: "10px",
                                          // height: "200px",
                                          width: "100%",
                                          border: sld
                                            ? "4px solid green"
                                            : "4px solid rgb(180, 187, 209)",
                                          borderRadius: "5px",
                                          objectFit: "cover",
                                          aspectRatio: "1/1"
                                        }}
                                      >
                                        <source
                                          src={Utils?.generateVideoURL(clp)}
                                          type="video/mp4"
                                        />
                                      </video>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              marginTop: "40px",
                            }}
                          >
                            <h5 className="block-title"> No Data Found</h5>
                          </div>
                        </>
                      )}
                    </div>
                  </TabPane>
                  <TabPane tabId="trainee">
                    <div className="media-gallery portfolio-section grid-portfolio">
                      {traineeClip?.length ? (
                        traineeClip?.map((cl, ind) => (
                          <div className={`collapse-block open`}>
                            <h5
                              className="block-title"
                              onClick={() => {
                                var temp = traineeClip;
                                temp = temp.map((vl) => {
                                  return { ...vl, show: false };
                                });
                                temp[ind].show = true;
                                setTraineeClips([...temp]);
                              }}
                            >
                              {cl?._id?.fullname}
                              <label className="badge badge-primary sm ml-2">
                                {cl?.clips?.length}
                              </label>
                            </h5>
                            {/*  NORMAL  STRUCTURE END  */}
                            <div className={`block-content `}>
                              <div className="row" style={{ margin: 0 }}>
                                {cl?.clips.map((clp, index) => {
                                  var sld = selectClips.find(
                                    (val) => val?._id === clp?.clips?._id
                                  );
                                  return (
                                    <div
                                      key={index}
                                      className={`col-3 p-1`}
                                      style={{ borderRadius: 5 }}
                                      onClick={() => {
                                        if (!sld && selectClips?.length < 2) {
                                          selectClips.push(clp?.clips);
                                          setSelectClips([...selectClips]);
                                        } else {
                                          var temp = JSON.parse(
                                            JSON.stringify(selectClips)
                                          );
                                          temp = temp.filter(
                                            (val) => val._id !== clp?.clips?._id
                                          );
                                          setSelectClips([...temp]);
                                        }
                                      }}
                                    >
                                      <video
                                        poster={Utils?.generateThumbnailURL(clp?.clips)}
                                        style={{
                                          // border: `${sld ? "2px" : "0px"} solid green`,
                                          // width: "98%",
                                          // maxHeight: "150px",
                                          // height: "100%",
                                          marginBottom: "10px",

                                          width: "100%",
                                          border: sld
                                            ? "4px solid green"
                                            : "4px solid rgb(180, 187, 209)",
                                          borderRadius: "5px",
                                          objectFit: "cover",
                                          aspectRatio: "1/1"
                                        }}
                                        preload="none"
                                      >
                                        <source
                                          src={Utils?.generateVideoURL(clp?.clips)}
                                          // src={Utils?.generateVideoURL(clp)}
                                          type="video/mp4"
                                        />
                                      </video>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "40px",
                          }}
                        >
                          <h5 className="block-title"> No Data Found</h5>
                        </div>
                      )}
                    </div>
                  </TabPane>
                  <TabPane tabId="docs">
                    <div className="media-gallery portfolio-section grid-portfolio">
                      <div className={`collapse-block open`}>
                        <div className={`block-content `}>
                          <div className="row">
                            {netquixVideos.map((clp, index) => {
                              var sld = selectClips.find(
                                (val) => val?._id === clp?._id
                              );
                              return (
                                clp?.file_name ?
                                  <div
                                    key={index}
                                    className={`col-3 p-1`}
                                    style={{ borderRadius: 5 }}
                                    onClick={() => {
                                      if (!sld && selectClips?.length < 2) {
                                        selectClips.push(clp);
                                        setSelectClips([...selectClips]);
                                      } else {
                                        var temp = JSON.parse(
                                          JSON.stringify(selectClips)
                                        );
                                        temp = temp.filter(
                                          (val) => val._id !== clp?._id
                                        );
                                        setSelectClips([...temp]);
                                      }
                                    }}
                                  >
                                    <video
                                      // style={{ border: `${sld ? "2px" : "0px"} solid green`, width: "98%", maxHeight: "150px", height: "100%", marginBottom: "10px", display: "flex", justifyContent: "center" }}
                                      style={{
                                        marginBottom: "10px",

                                        width: "100%",
                                        border: sld
                                          ? "4px solid green"
                                          : "4px solid rgb(180, 187, 209)",
                                        borderRadius: "5px",
                                        objectFit: "cover",
                                        aspectRatio: "1/1"
                                      }}
                                    >
                                      <source
                                        src={Utils?.generateVideoURL(clp)}
                                        type="video/mp4"
                                      />
                                    </video>
                                  </div> : null
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabPane>
                </TabContent>
              </div>
            </div>

            {clipSelectNote && (
              <Notes
                isOpen={clipSelectNote}
                onClose={setClipSelectNote}
                title={"Select clips"}
                desc={"Select clips to choose up to two clips, videos will load onto your board when you click the X (cross)."}
                style={{
                  top: "10px",
                  left: "10px",
                }}
                triangle={"clip-select"}
                nextFunc={() => {
                  setClipSelectNote(false);
                }}
              />
            )}
          </>


        }
      />
    </div>
  );
};
