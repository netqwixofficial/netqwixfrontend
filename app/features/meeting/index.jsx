// Feature entry point for meeting/calling experience.
// Currently re-exports existing portrait-calling VideoCallUI implementation
// so routes can depend on a stable feature path without changing behavior.

import VideoCallUI from "../../components/portrait-calling";

export default VideoCallUI;