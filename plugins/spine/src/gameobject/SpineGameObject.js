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
 * @extends Phaser.GameObjects.Components.Alpha
 * @extends Phaser.GameObjects.Components.BlendMode
 * @extends Phaser.GameObjects.Components.Depth
 * @extends Phaser.GameObjects.Components.Flip
 * @extends Phaser.GameObjects.Components.Transform
 * @extends Phaser.GameObjects.Components.Visible
 * @extends Phaser.GameObjects.Components.ScrollFactor
 *
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

        /**
         * Draw debug info for the spine object
         *
         * @name Phaser.GameObjects.SpineGameObject#drawDebug
         * @type {boolean}
         * @since 3.16.0
         */
        this.drawDebug = false;

        /**
         * The timeScale used for spine runtime
         *
         * @name Phaser.GameObjects.SpineGameObject#timeScale
         * @type {number}
         * @since 3.16.0
         */
        this.timeScale = 1;

        this.setPosition(x, y);

        if (key)
        {
            this.setSkeleton(key, animationName, loop);
        }
    },

    /**
     * Gets a list of the animations available.
     *
     * @method Phaser.GameObjects.SpineGameObject#setSkeleton
     * @public
     * @since 3.16.0
     *
     * @param {string} textureKey - The key of the atlas Texture this Spine Game Object will use to render with, as stored in the Texture Manager.
     * @param {string} animationName - The animation name.
     * @param {loop} atlasDataKey - The animation name.
     * @param {skeletonJSON} skeletonJSON - The animation name.
     *
     * @returns {Phaser.GameObjects.SpineGameObject} an array of the animation names.
     */
    setSkeleton: function (textureKey, animationName, loop, skeletonJSON)
    {
        var data = this.plugin.createSkeleton(textureKey, skeletonJSON);

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
            event: function (trackEntry, event)
            {
                //  Event on a Track
                _this.emit('spine.event', _this, trackEntry, event);
            },
            complete: function (trackEntry, loopCount)
            {
                //  Animation on Track x completed, loop count
                _this.emit('spine.complete', _this, trackEntry, loopCount);
            },
            start: function (trackEntry)
            {
                //  Animation on Track x started
                _this.emit('spine.start', _this, trackEntry);
            },
            end: function (trackEntry)
            {
                //  Animation on Track x ended
                _this.emit('spine.end', _this, trackEntry);
            },
            dispose: function (trackEntry)
            {
                // Animation on Track x disposed
                _this.emit('spine.dispose', _this, trackEntry);
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
     * @returns {spine.trackEntry} A track entry to allow further customization of animation playback.
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
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     */
    setEmptyAnimation: function (trackIndex, mixDuration)
    {
        this.state.setEmptyAnimation(trackIndex, mixDuration);

        return this;
    },

    /**
     * Returns the track entry for the animation currently playing on the track, or null if no animation is currently playing.
     *
     * @method Phaser.GameObjects.SpineGameObject#getCurrent
     * @public
     * @since 3.16.0
     *
     * @param {number} trackIndex - The index of the track.
     *
     * @returns {spine.trackEntry}
     */
    getCurrent: function (trackIndex)
    {
        return this.state.getCurrent(trackIndex);
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
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
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
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     *
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
     *
     * @returns {boolean} True if any animations were applied.
     *
     */
    setSkinByName: function (skinName)
    {
        var skeleton = this.skeleton;

        skeleton.setSkinByName(skinName);

        skeleton.setSlotsToSetupPose();

        return this.state.apply(skeleton);
    },

    /**
     * Sets a skin
     *
     * @method Phaser.GameObjects.SpineGameObject#setSkin
     * @public
     * @since 3.16.0
     *
     * @param {spine.Skin} newSkin - The new skin.
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     *
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
     *
     * @returns {Phaser.GameObjects.SpineGameObject}
     *
     */
    setMix: function (fromName, toName, duration)
    {
        this.stateData.setMix(fromName, toName, duration);

        return this;
    },

    /**
     * Finds a bone by comparing each bone's name. It is more efficient to cache the results of this method than to call it multiple times.
     *
     * @method Phaser.GameObjects.SpineGameObject#findBone
     * @public
     * @since 3.16.0
     *
     * @param {string} boneName - The name of the bone.
     *
     * @returns {spine.Bone|null}
     *
     */
    findBone: function (boneName)
    {
        return this.skeleton.findBone(boneName);
    },

    /**
     * Finds a slot by comparing each slot's name. It is more efficient to cache the results of this method than to call it multiple times.
     *
     * @method Phaser.GameObjects.SpineGameObject#findSlot
     * @public
     * @since 3.16.0
     *
     * @param {string} slotName - The name of the slot.
     *
     * @returns {spine.SlotData|null}
     *
     */
    findSlot: function (slotName)
    {
        return this.skeleton.findSlot(slotName);
    },

    /**
     * The skeleton's slots.
     *
     * @method Phaser.GameObjects.SpineGameObject#getSlots
     * @public
     * @since 3.16.0
     *
     *
     * @returns {list<spine.SlotData>}
     *
     */
    getSlots: function ()
    {
        return this.skeleton.slots;
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
