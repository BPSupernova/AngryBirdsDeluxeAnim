// A class for a Spline
class Spline {
    constructor(nSplines = 0, cPoints = 0, animTime = 0, pointsData = []) {
        this.nSplines = nSplines; // Number of splines within this file
        this.cPoints = cPoints; // Number of control points for the spline
        this.animTime = animTime; // Time it takes (seconds) to move the object from start to finish
        this.pointsData = pointsData; // Pair of arrays containing position and rotation data
    }

    /**
     * Prints this entire Spline object
     */
    printSpline() {
        console.log("Spline definition: ", this);
    }

    /**
     * Generates an interpolated point using the catmullRom algorithm
     * @param {*} p0 A 3D point
     * @param {*} p1 A 3D point
     * @param {*} p2 A 3D point
     * @param {*} p3 A 3D point
     * @param {*} tension The tension to fine-tune the spline
     * @returns An interpolated 3D point
     */
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

    /**
     * Generates an interpolated point using the uniformBSpline algorithm
     * @param {*} p0 A 3D point
     * @param {*} p1 A 3D point
     * @param {*} p2 A 3D point
     * @param {*} p3 A 3D point
     * @param {*} tension The tension to fine-tune the spline
     * @returns An interpolated 3D point
     */
    uniformBSpline(p0, p1, p2, p3, tension) {
        const v0 = vec3(p0.x, p0.y, p0.z);
        const v1 = vec3(p1.x, p1.y, p1.z);
        const v2 = vec3(p2.x, p2.y, p2.z);
        const v3 = vec3(p3.x, p3.y, p3.z);
    
        // Uniform B-Spline coefficients
        const t2 = tension * tension;
        const t3 = t2 * tension;
    
        // blending functions for Uniform B-Spline
        const b0 = (1 - tension) * (1 - tension) * (1 - tension) / 6;
        const b1 = (3 * t3 - 6 * t2 + 4) / 6;
        const b2 = (-3 * t3 + 3 * t2 + 3 * tension + 1) / 6;
        const b3 = t3 / 6;
    
        // Calculate the interpolated position
        const result = add(scale(b0, v0), add(scale(b1, v1), add(scale(b2, v2), scale(b3, v3))));
    
        return { x: result[0], y: result[1], z: result[2] };
    }
}

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

function parseSplineData(data) {
    const lines = data.split('\n');
    let lineIndex = 0;

    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const nSplines = parseInt(lines[lineIndex++]);

    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const cPoints = parseInt(lines[lineIndex++]);

    while (lineIndex < lines.length && (lines[lineIndex].trim().startsWith('#') || lines[lineIndex].trim() === '')) {
        lineIndex++;
    }

    const animTime = parseFloat(lines[lineIndex++]);

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

function getInterpolatedPoint(spline, nTime) {
    nTime = Math.max(0, Math.min(1, nTime));

    const segments = spline.cPoints - 3;
    const segmentTime = 1.0 / segments;

    let currentSegment = Math.floor(nTime / segmentTime);
    currentSegment = Math.max(0, Math.min(segments - 1, currentSegment));

    let localTime = (nTime - currentSegment * segmentTime) / segmentTime;

    const p0 = spline.pointsData[currentSegment].pos;
    const p1 = spline.pointsData[currentSegment + 1].pos;
    const p2 = spline.pointsData[currentSegment + 2].pos;
    const p3 = spline.pointsData[currentSegment + 3].pos;

    return spline.catmullSpline(p0, p1, p2, p3, localTime);
}

function updateModelOnSpline(model, currentTime) {
    if (!isAnimatingWSpline || !splineData) return;
    
    const elapsedTime = (currentTime - splineAnimStartTime) / 1000;
    const normalizedTime = elapsedTime / splineData.animTime;
    
    // Upon completed spline animation, stop
    if (normalizedTime >= 1.0) {
        const finalPos = splineData.pointsData[splineData.pointsData.length - 1].pos;
        model.position = vec3(finalPos.x, finalPos.y, finalPos.z);
        model.updateModelMatrix();
        isAnimating = false;
        return;
    }

    const currentPos = getInterpolatedPoint(splineData, normalizedTime);
    const nextPos = getInterpolatedPoint(splineData, normalizedTime + 0.01);
    
    model.position = vec3(currentPos.x, currentPos.y, currentPos.z);
    model.rotation = calculateRedsSplineRotation(currentPos, nextPos);
    
    model.updateModelMatrix();
}


function calculateRedsSplineRotation(currentPos, nextPos) {
    const direction = subtract(
        vec3(nextPos.x, nextPos.y, nextPos.z),
        vec3(currentPos.x, currentPos.y, currentPos.z)
    );

    const yaw = Math.atan2(direction[2], direction[0]) * 180 / Math.PI + 90;
    const horizontalDist = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);
    const pitch = -Math.atan2(direction[1], horizontalDist) * 180 / Math.PI;

    return vec3(pitch, yaw + 90, 0);
}