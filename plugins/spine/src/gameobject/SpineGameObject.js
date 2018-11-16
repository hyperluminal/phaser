/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2018 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var Class = require('../../../../src/utils/Class');
var ComponentsAlpha = require('../../../../src/gameobjects/components/Alpha');
var ComponentsBlendMode = require('../../../../src/gameobjects/components/BlendMode');
var ComponentsDepth = require('../../../../src/gameobjects/components/Depth');
var ComponentsFlip = require('../../../../src/gameobjects/components/Flip');
var ComponentsScrollFactor = require('../../../../src/gameobjects/components/ScrollFactor');
var ComponentsTransform = require('../../../../src/gameobjects/components/Transform');
var ComponentsVisible = require('../../../../src/gameobjects/components/Visible');
var GameObject = require('../../../../src/gameobjects/GameObject');
var SpineGameObjectRender = require('./SpineGameObjectRender');

/**
 * @classdesc
 * TODO
 *
 * @class SpineGameObject
 * @extends Phaser.GameObjects.GameObject
 * @memberof Phaser.GameObjects
 * @constructor
 * @since 3.16.0
 *
 * @param {Phaser.Scene} scene - A reference to the Scene that has installed this plugin.
 * @param {Phaser.Plugins.PluginManager} plugin - A reference to the Phaser Plugin Manager.
 * @param {number} x
 * @param {number} y
 * @param {string} animationName
 * @param {boolean} loop
 */
var SpineGameObject = new Class({

    Extends: GameObject,

    Mixins: [
        ComponentsAlpha,
        ComponentsBlendMode,
        ComponentsDepth,
        ComponentsFlip,
        ComponentsScrollFactor,
        ComponentsTransform,
        ComponentsVisible,
        SpineGameObjectRender
    ],

    initialize:

    function SpineGameObject (scene, plugin, x, y, key, animationName, loop)
    {
        GameObject.call(this, scene, 'Spine');

        this.plugin = plugin;

        this.runtime = plugin.getRuntime();

        this.skeleton = null;
        this.skeletonData = null;

        this.state = null;
        this.stateData = null;

        this.drawDebug = false;

        this.timeScale = 1;

        this.setPosition(x, y);

        if (key)
        {
            this.setSkeleton(key, animationName, loop);
        }
    },

    setSkeletonFromJSON: function (atlasDataKey, skeletonJSON, animationName, loop)
    {
        return this.setSkeleton(atlasDataKey, skeletonJSON, animationName, loop);
    },

    setSkeleton: function (atlasDataKey, animationName, loop, skeletonJSON)
    {
        var data = this.plugin.createSkeleton(atlasDataKey, skeletonJSON);

        this.skeletonData = data.skeletonData;

        var skeleton = data.skeleton;

        skeleton.flipY = (this.scene.sys.game.config.renderType === 1);

        skeleton.setToSetupPose();

        skeleton.updateWorldTransform();

        skeleton.setSkinByName('default');

        this.skeleton = skeleton;

        //  AnimationState
        data = this.plugin.createAnimationState(skeleton);

        if (this.state)
        {
            this.state.clearListeners();
            this.state.clearListenerNotifications();
        }

        this.state = data.state;

        this.stateData = data.stateData;

        var _this = this;

        this.state.addListener({
            event: function (trackIndex, event)
            {
                //  Event on a Track
                _this.emit('spine.event', _this, trackIndex, event);
            },
            complete: function (trackIndex, loopCount)
            {
                //  Animation on Track x completed, loop count
                _this.emit('spine.complete', _this, trackIndex, loopCount);
            },
            start: function (trackIndex)
            {
                //  Animation on Track x started
                _this.emit('spine.start', _this, trackIndex);
            },
            end: function (trackIndex)
            {
                //  Animation on Track x ended
                _this.emit('spine.end', _this, trackIndex);
            }
        });

        if (animationName)
        {
            this.setAnimation(0, animationName, loop);
        }

        return this;
    },

    // http://esotericsoftware.com/spine-runtimes-guide

    /**
     * Gets a list of the animations available.
     *
     * @method Phaser.GameObjects.SpineGameObject#getAnimationList
     * @public
     * @since 3.16.0
     *
     * @returns {string[]} an array of the animation names.
     */
    getAnimationList: function ()
    {
        var output = [];

        var skeletonData = this.skeletonData;

        if (skeletonData)
        {
            for (var i = 0; i < skeletonData.animations.length; i++)
            {
                output.push(skeletonData.animations[i].name);
            }
        }

        return output;
    },

    /**
     * Plays an animation by name.
     *
     * @method Phaser.GameObjects.SpineGameObject#play
     * @public
     * @since 3.16.0
     *
     * @param {string} animationName - The animation name.
     * @param {boolean} loop - If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its duration.
     * In either case trackEnd determines when the track is cleared.
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     */
    play: function (animationName, loop)
    {
        if (loop === undefined)
        {
            loop = false;
        }

        return this.setAnimation(0, animationName, loop);
    },

    /**
     * Sets an animation by name.
     *
     * @method Phaser.GameObjects.SpineGameObject#setAnimation
     * @public
     * @since 3.16.0
     *
     * @param {number} trackIndex - The index of the track.
     * @param {string} animationName - The animation name.
     * @param {boolean} loop - If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its duration.
     * In either case trackEnd determines when the track is cleared.
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     */
    setAnimation: function (trackIndex, animationName, loop)
    {
        this.state.setAnimation(trackIndex, animationName, loop);

        return this;
    },

    /**
     * Adds an animation to be played after the current or last queued animation for a track.
     * If the track is empty, it is equivalent to calling setAnimation.
     *
     * @method Phaser.GameObjects.SpineGameObject#addAnimation
     * @public
     * @since 3.16.0
     *
     * @param {number} trackIndex - The index of the track.
     * @param {string} animationName - The index of the track.
     * @param {string} loop - The index of the track.
     * @param {string} delay - The index of the track.
     *
     * @returns {any} A track entry to allow further customization of animation playback.
     */
    addAnimation: function (trackIndex, animationName, loop, delay)
    {
        return this.state.addAnimation(trackIndex, animationName, loop, delay);
    },

    /**
     * Sets an empty animation for a track, discarding any queued animations, and sets the track entry's mixDuration.
     * An empty animation has no timelines and serves as a placeholder for mixing in or out.
     *
     * Mixing out is done by setting an empty animation with a mix duration using either setEmptyAnimation, setEmptyAnimations,
     * or addEmptyAnimation. Mixing to an empty animation causes the previous animation to be applied less and less over the mix duration.
     * Properties keyed in the previous animation transition to the value from lower tracks or to the setup pose value if no lower
     * tracks key the property. A mix duration of 0 still mixes out over one frame.
     *
     * Mixing in is done by first setting an empty animation, then adding an animation using addAnimation and on the returned track entry,
     * set the mixDuration. Mixing from an empty animation causes the new animation to be applied more and more over the mix duration.
     * Properties keyed in the new animation transition from the value from lower tracks or from the setup pose value if no lower tracks
     * key the property to the value keyed in the new animation.
     *
     * @method Phaser.GameObjects.SpineGameObject#setEmptyAnimation
     * @public
     * @since 3.16.0
     *
     * @param {number} trackIndex - The index of the track.
     * @param {number} mixDuration - The index of the track.
     */
    setEmptyAnimation: function (trackIndex, mixDuration)
    {
        this.state.setEmptyAnimation(trackIndex, mixDuration);

        return this;
    },

    /**
     * Removes all animations from the track, leaving skeletons in their previous pose.
     * It may be desired to use setEmptyAnimations to mix the skeletons back to the setup pose,
     * rather than leaving them in their previous pose.
     *
     * @method Phaser.GameObjects.SpineGameObject#clearTrack
     * @public
     * @since 3.16.0
     *
     * @param {number} trackIndex - The index of the track.
     */
    clearTrack: function (trackIndex)
    {
        this.state.clearTrack(trackIndex);

        return this;
    },

    /**
     * Removes all animations from all tracks, leaving skeletons in their previous pose.
     * It may be desired to use setEmptyAnimations to mix the skeletons back to the setup pose,
     * rather than leaving them in their previous pose.
     *
     * @method Phaser.GameObjects.SpineGameObject#clearTracks
     * @public
     * @since 3.16.0
     */
    clearTracks: function ()
    {
        this.state.clearTracks();

        return this;
    },

    /**
     * Sets a skin by name.
     *
     * @method Phaser.GameObjects.SpineGameObject#setSkinByName
     * @public
     * @since 3.16.0
     *
     * @param {string} skinName - The name of the new skin.
     */
    setSkinByName: function (skinName)
    {
        var skeleton = this.skeleton;

        skeleton.setSkinByName(skinName);

        skeleton.setSlotsToSetupPose();

        this.state.apply(skeleton);

        return this;
    },

    /**
     * Sets a skin.
     *
     * @method Phaser.GameObjects.SpineGameObject#setSkin
     * @public
     * @since 3.16.0
     *
     * @param {spine.Skin} newSkin - The new skin.
     */
    setSkin: function (newSkin)
    {
        var skeleton = this.skeleton;

        skeleton.setSkin(newSkin);

        skeleton.setSlotsToSetupPose();

        this.state.apply(skeleton);

        return this;
    },

    /**
     * Sets a mix duration by animation name.
     *
     * @method Phaser.GameObjects.SpineGameObject#setMix
     * @public
     * @since 3.16.0
     *
     * @param {string} fromName - The name state to mix from.
     * @param {string} toName - The name of the state to mix to.
     * @param {string} duration - The duration of the mix.
     */
    setMix: function (fromName, toName, duration)
    {
        this.stateData.setMix(fromName, toName, duration);

        return this;
    },

    /**
     * Find a bone on this skeleton by name
     *
     * @method Phaser.GameObjects.SpineGameObject#findBone
     * @public
     * @since 3.16.0
     *
     * @param {string} boneName - The name of the bone.
     */
    findBone: function (boneName)
    {
        return this.skeleton.findBone(boneName);
    },

    /**
     * Find a bone index on this skeleton by name
     *
     * @method Phaser.GameObjects.SpineGameObject#findBoneIndex
     * @public
     * @since 3.16.0
     *
     * @param {string} boneName - The name of the bone.
     */
    findBoneIndex: function (boneName)
    {
        return this.skeleton.findBoneIndex(boneName);
    },

    /**
     * Find a slot index by name
     *
     * @method Phaser.GameObjects.SpineGameObject#findSlot
     * @public
     * @since 3.16.0
     *
     * @param {string} slotName - The name of the slot.
     */
    findSlot: function (slotName)
    {
        return this.skeleton.findSlot(slotName);
    },

    /**
     * Find the given slot's index
     *
     * @method Phaser.GameObjects.SpineGameObject#findSlotIndex
     * @public
     * @since 3.16.0
     *
     * @param {string} slotName - The name of the slot.
     */
    findSlotIndex: function (slotName)
    {
        return this.skeleton.findSlotIndex(slotName);
    },

    /**
     * todo
     *
     * @method Phaser.GameObjects.SpineGameObject#getBounds
     * @public
     * @since 3.16.0
     */
    getBounds: function ()
    {
        return this.plugin.getBounds(this.skeleton);
    },

    /**
     * Update this SpineGameObject's animations.
     *
     * @method Phaser.GameObjects.SpineGameObject#preUpdate
     * @protected
     * @since 3.16.0
     *
     * @param {number} time - The current timestamp.
     * @param {number} delta - The delta time, in ms, elapsed since the last frame.
     */
    preUpdate: function (time, delta)
    {
        var skeleton = this.skeleton;

        skeleton.flipX = this.flipX;
        skeleton.flipY = this.flipY;

        this.state.update((delta / 1000) * this.timeScale);

        this.state.apply(skeleton);

        this.emit('spine.update', skeleton);

        skeleton.updateWorldTransform();
    },

    /**
     * Internal destroy handler, called as part of the destroy process.
     *
     * @method Phaser.GameObjects.RenderTexture#preDestroy
     * @protected
     * @since 3.16.0
     */
    preDestroy: function ()
    {
        if (this.state)
        {
            this.state.clearListeners();
            this.state.clearListenerNotifications();
        }

        this.plugin = null;
        this.runtime = null;

        this.skeleton = null;
        this.skeletonData = null;

        this.state = null;
        this.stateData = null;
    }

});

module.exports = SpineGameObject;
