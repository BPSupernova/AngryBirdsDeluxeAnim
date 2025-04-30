/**
 * Converts Euler rotation angles into a quaternion
 * @param {*} rotX The x-axis rotation angle 
 * @param {*} rotY The y-axis rotation angle
 * @param {*} rotZ The z-axis rotation angle
 * @returns A quaternion
 */
function euler2Quaternion(rotX, rotY, rotZ) {
    let w = Math.cos(rotX/2) * Math.cos(rotY/2) * Math.cos(rotZ/2) 
            + Math.sin(rotX/2) * Math.sin(rotY/2) * Math.sin(rotZ/2);

    let x = Math.sin(rotX/2) * Math.cos(rotY/2) * Math.cos(rotZ/2)
            - Math.cos(rotX/2) * Math.sin(rotY/2) * Math.sin(rotZ/2);

    let y = Math.cos(rotX/2) * Math.sin(rotY/2) * Math.cos(rotZ/2)
            + Math.sin(rotX/2) * Math.cos(rotY/2) * Math.sin(rotZ/2);

    let z = Math.cos(rotX/2) * Math.cos(rotY/2) * Math.sin(rotZ/2)
            - Math.sin(rotX/2) * Math.sin(rotY/2) * Math.cos(rotZ/2);

    return [w, x, y, z];
}

/**
 * Converts a quaternion into Euler angles/rotations
 * @param {*} q The quaternion to be converted
 * @returns The x, y, and z Euler rotation angles
 */
function quaternion2Euler(q) {
    let w = q[0], x = q[1], y = q[2], z = q[3];

    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * (Math.PI / 2); 
    } else {
        pitch = Math.asin(sinp);
    }

    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return vec3(roll, pitch, yaw);
}

/**
 * Performs spherical linear interpolation (SLERP) between two quaternions to achieve smooth rotation transitions. 
 * This maintains constant angular velocity and avoids distortions in rotation interpolation.
 * @param {Array} q1 - The starting quaternion in [w, x, y, z] format
 * @param {Array} q2 - The ending quaternion in [w, x, y, z] format
 * @param {number} t - The interpolation parameter, or tension so to speak; 0 -> q1, 1 -> q2
 * @returns {Array} The interpolated quaternion in [w, x, y, z] format
 */
function slerp(q1, q2, t) {
    let cosHalfTheta = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
    
    if (cosHalfTheta < 0) {
        q2 = q2.map(x => -x);
        cosHalfTheta = -cosHalfTheta;
    }
    
    if (Math.abs(cosHalfTheta) >= 1.0) {
        return q1;
    }
    
    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);
    
    if (Math.abs(sinHalfTheta) < 0.001) {
        return [
            0.5*(q1[0] + q2[0]),
            0.5*(q1[1] + q2[1]),
            0.5*(q1[2] + q2[2]),
            0.5*(q1[3] + q2[3])
        ];
    }
    
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    
    return [
        q1[0]*ratioA + q2[0]*ratioB,
        q1[1]*ratioA + q2[1]*ratioB,
        q1[2]*ratioA + q2[2]*ratioB,
        q1[3]*ratioA + q2[3]*ratioB
    ];
}

/**
 * A simple function that converts a value in radians to degrees
 * @param {*} radians A value in radians
 * @returns The input value converted to degrees
 */
function degrees(radians) {
    return radians * 180.0 / Math.PI;
}