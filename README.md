Angry Birds Remastered
Zach Medailleu and Ben Perry

We created an animation of angry birds being pulled back in a slingshot, then firing from it. The birds aim for the tower with the pig on it, and when it's hit, the tower falls down.

A Catmull-Rom spline is used to control the red bird's movement.
The red bird rotates in midair using quaternions and SLERPing.
When the tower is hit, the pig squishes using shape deformation.
The animation of the rubber band of the slingshot being pulled back is done using skeletal animation.
The tower is built using hierarchical modeling and falls using kinematics.
The blue bird's launch is calculated using physically-based animation.

Pressing G will select the red bird's animation, and pressing F will select the blue bird's animation. Pressing the space bar will start the animation once selected, pulling back the selected bird. Pressing space again will launch the bird. 
The sliders will adjust the angle of the blue bird's launch. This allows you to control its launch to fire it into the tower.

The main challenge that we faced during the project was figuring out how to put everything together. Designing a project specifically to handle a spline or to create a skeletal animation is one thing, but when putting it all together, we had to make sure that all parts worked correctly without causing problems for a different part of the animation. Animating the scene was tricky logistically too, since different functionality would be applied to the scene at different times. For instance, physically-based animation and splines never run at the same time, since they are applied to different birds, so it was interesting isolating some behavior and combining others.

Parts Zach worked on:
- Creating the slingshot and the animation of its rubber band
- The physically-based animation of the blue bird
- Causing the pig to squish using shape deformation
- The timing of when each part is animated and the controls for the animation
- The extra styling on the page and the victory/fail text

Parts Ben worked on:
- Drawing and rendering the models
- The spline of the red bird
- Rotating the red bird using quaternions
- Making the tower fall using kinematics