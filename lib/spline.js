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