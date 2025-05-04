// A class for a Spline
class Spline {
    constructor(nSplines = 0, cPoints = 0, animTime = 0, pointsData = []) {
        this.nSplines = nSplines; // Number of splines within this file
        this.cPoints = cPoints; // Number of control points for the spline
        this.animTime = animTime; // Time it takes (seconds) to move the object from start to finish
        this.pointsData = pointsData; // Pair of arrays containing position and rotation data
    }


    //prints entire spline object
    printSpline() {
        console.log("Spline definition: ", this);
    }


    //Generates an interpolated point using the catmullRom algorithm
    catmullSpline(p0, p1, p2, p3, tension) {
        const v0 = vec3(p0.x, p0.y, p0.z);
        const v1 = vec3(p1.x, p1.y, p1.z);
        const v2 = vec3(p2.x, p2.y, p2.z);
        const v3 = vec3(p3.x, p3.y, p3.z);
    
        // Catmull coefficients
        const t2 = tension * tension;
        const t3 = t2 * tension;
    
        // blending functions for Catmull-Rom Spline
        const b0 = -0.5 * t3 + t2 - 0.5 * tension;
        const b1 = 1.5 * t3 - 2.5 * t2 + 1;
        const b2 = -1.5 * t3 + 2 * t2 + 0.5 * tension;
        const b3 = 0.5 * t3 - 0.5 * t2;
    
        // Calculate the interpolated position
        const result = add(scale(b0, v0), add(scale(b1, v1), add(scale(b2, v2), scale(b3, v3))));
    
        return { x: result[0], y: result[1], z: result[2] };
    }
}

//load spline data from file to allow for parsing
async function loadSpline(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Failed to load spline.txt');

        const data = await response.text();
        return parseSplineData(data);
    } catch (error) {
        console.error("Error loading spline.txt", error);
        return null;
    }
}

//parse through spline data and set the data to variables
function parseSplineData(data) {
    const lines = data.split('\n');
    let lineIndex = 0;

    //ignore comments, set first non-comment line to the number of splines
    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const nSplines = parseInt(lines[lineIndex++]);

    //ignore comments, set next non-comment line to the number of control points
    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const cPoints = parseInt(lines[lineIndex++]);

    //ignore comments, set next non-comment line to the number of seconds in the animation
    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const animTime = parseFloat(lines[lineIndex++]);

    //populate a list with the position and rotation of the object at each control point
    let pointsData = [];
    for (let i = 0; i < cPoints; i++) {
        while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
            lineIndex++;
        }

        if (lineIndex >= lines.length) break;
        const posLine = lines[lineIndex++].split(',');
        const pos = {
            x: parseFloat(posLine[0]),
            y: parseFloat(posLine[1]),
            z: parseFloat(posLine[2])
        };

        while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
            lineIndex++;
        }

        if (lineIndex >= lines.length) break;
        const rotLine = lines[lineIndex++].split(',');
        const rot = {
            x: parseFloat(rotLine[0]),
            y: parseFloat(rotLine[1]),
            z: parseFloat(rotLine[2])
        };
        
        pointsData.push({pos, rot});
    }

    return new Spline(nSplines, cPoints, animTime, pointsData);
}

//calculate the current position of the object on the spline based on the elapsed time
function getInterpolatedPoint(spline, nTime) {
    nTime = Math.max(0, Math.min(1, nTime));

    const segments = spline.cPoints - 3;
    const segmentTime = 1.0 / segments;

    let currentSegment = Math.floor(nTime / segmentTime);
    currentSegment = Math.max(0, Math.min(segments - 1, currentSegment));

    let localTime = (nTime - currentSegment * segmentTime) / segmentTime;

    // Position interpolation
    const p0 = spline.pointsData[currentSegment].pos;
    const p1 = spline.pointsData[currentSegment + 1].pos;
    const p2 = spline.pointsData[currentSegment + 2].pos;
    const p3 = spline.pointsData[currentSegment + 3].pos;
    const interpolatedPos = spline.catmullSpline(p0, p1, p2, p3, localTime);

    // Rotation interpolation (using quaternion slerp between q1 and q2)
    const q1 = euler2Quaternion(
        radians(spline.pointsData[currentSegment + 1].rot.x),
        radians(spline.pointsData[currentSegment + 1].rot.y),
        radians(spline.pointsData[currentSegment + 1].rot.z)
    );
    
    const q2 = euler2Quaternion(
        radians(spline.pointsData[currentSegment + 2].rot.x),
        radians(spline.pointsData[currentSegment + 2].rot.y),
        radians(spline.pointsData[currentSegment + 2].rot.z)
    );
    
    const interpolatedQuat = slerp(q1, q2, localTime);

    return {
        position: interpolatedPos,
        rotation: interpolatedQuat
    };
}

//update the model as it travels along the sline
function updateModelOnSpline(model, currentTime) {
    if (!isAnimatingWSpline || !splineData) return;
    
    const elapsedTime = (currentTime - splineAnimStartTime) / 1000;
    const normalizedTime = elapsedTime / splineData.animTime;
    
    // Handle animation completion
    if (normalizedTime >= 1.0) {
        const finalPoint = splineData.pointsData[splineData.pointsData.length - 1];
        model.position = vec3(finalPoint.pos.x, finalPoint.pos.y, finalPoint.pos.z);
        
        // Reset to Euler angles after animation
        model.useQuaternion = false;
        isAnimatingWSpline = false;
        animationInProgress = false;
        textX = 0;
        textY = 0;
        prepareText();
        showFailText = true;
        return;
    }

    const interpolated = getInterpolatedPoint(splineData, normalizedTime);
    
    // Update position and rotation
    model.position = vec3(
        interpolated.position.x,
        interpolated.position.y,
        interpolated.position.z
    );
    
    // Use quaternion rotation only during animation
    model.useQuaternion = true;
    model.tempQuaternion = interpolated.rotation;
    
    model.updateModelMatrix();
}