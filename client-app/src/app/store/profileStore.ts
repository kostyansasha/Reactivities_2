import { makeAutoObservable, reaction, runInAction } from "mobx";
import { Photo, Profile, UserActivity } from "../models/profile";
import agent from "../api/agent";
import { store } from "./store";

export default class ProfileStore {
    profile: Profile | null = null;
    loadingProfile = false;
    uploading: boolean = false;
    loading: boolean = false;
    followings: Profile[] = [];
    loadingFollowings: boolean = false;
    activeTab = 0;

    userActivities: UserActivity[] = [];
    loadingUserActivities = false;

    constructor() {
        makeAutoObservable(this);

        reaction(
            () => this.activeTab,
            activeTab => {
                if (activeTab === 3 || activeTab === 4) {
                    const predicate = activeTab === 3 ? 'followers' : 'following';
                    this.loadFollowings(predicate);
                }
                else {
                    this.followings = [];
                }
            }
        )
    }

    setActiveTab = (activeTab: any) => {
        this.activeTab = activeTab;
    }

    get isCurrentUser() {
        if (store.userStore.user && this.profile) {
            return store.userStore.user.username === this.profile.username;
        }

        return false;
    }

    loadProfile = async (username: string) => {
        this.loadingProfile = true;
        try {
            const profile = await agent.Profiles.get(username);
            runInAction(() => {
                this.profile = profile;
                this.loadingProfile = false;
            });
        } catch (error) {
            console.log(error);
            runInAction(() => this.loadingProfile = false);
        }
    }

    uploadPhoto = async (file: Blob) => {
        this.uploading = true;
        try {
            const response = await agent.Profiles.uploadPhoto(file);
            const photo = response.data;
            runInAction(() => {
                if (this.profile) {
                    this.profile.photos?.push(photo);
                    if (photo.isMain && store.userStore.user) {
                        store.userStore.setImage(photo.url);
                        this.profile.image = photo.url;
                    }
                }
                this.uploading = false;
            });
        } catch (error) {
            runInAction(() => this.uploading = false);
        }
    }

    setMainPhoto = async (photo: Photo) => {
        this.loading = true;
        try {
            await agent.Profiles.setMainPhoto(photo.id);
            store.userStore.setImage(photo.url);
            runInAction(() => {
                if (this.profile && this.profile.photos) {
                    this.profile.photos.find(p => p.isMain)!.isMain = false;
                    this.profile.photos.find(p => p.id === photo.id)!.isMain = true;
                    this.profile.image = photo.url;
                    this.loading = false;
                }
            })
        } catch (error) {
            console.log(error);
            runInAction(() => this.loading = false);
        }
    }

    deletePhoto = async (id: string) => {
        this.loading = true;
        try {
            await agent.Profiles.deletePhoto(id);
            runInAction(() => {
                if (this.profile && this.profile.photos) {
                    this.profile.photos = this.profile.photos.filter(p => p.id !== id);
                    this.loading = false;
                }
            })
        } catch (error) {
            console.log(error);
            runInAction(() => this.loading = false);
        }
    }

    updateProfile = async (profile: Partial<Profile>) => {
        this.uploading = true;
        try {
            await agent.Profiles.update(profile);
            runInAction(() => {
                if (profile.displayName && profile.displayName !== store.userStore.user?.displayName) {
                    store.userStore.setDisplayName(profile.displayName);
                }

                this.profile = { ...this.profile, ...profile as Profile };
                this.uploading = false;
            });
        } catch (error) {
            runInAction(() => this.uploading = false);
            throw error;
        }
    }

    updateFollowing = async (username: string, following: boolean) => {
        this.loading = true;
        try {
            await agent.Profiles.updateFollowing(username);
            store.activityStore.updateAttendeeFollowing(username);
            runInAction(() => {
                if (this.profile && this.profile.username !== store.userStore.user?.username && this.profile.username === username) {
                    following ? this.profile.followersCount++ : this.profile.followersCount--;
                    this.profile.following = !this.profile.following;
                }

                if (this.profile && this.profile.username === store.userStore.user?.username) {
                    following ? this.profile.followersCount++ : this.profile.followersCount--;
                }

                this.followings.forEach(profile => {
                    if (profile.username === username) {
                        profile.following ? profile.followersCount-- : profile.followersCount++;
                        profile.following = !profile.following;
                    }
                });

                this.loading = false
            });
        } catch (error) {
            console.log(error);
            runInAction(() => this.loading = false);
        }
    }

    loadFollowings = async (predicate: string) => {
        this.loadingFollowings = true;
        try {
            const followings = await agent.Profiles.listFollowings(this.profile!.username, predicate);
            runInAction(() => {
                this.followings = followings;
                this.loadingFollowings = false;
            });
        } catch (error) {
            console.log(error);
            runInAction(() => this.loadingFollowings = false);
        }
    }

    loadUserActivities = async (predicate: string) => {
        this.loadingUserActivities = true;
        try {
            const activities = await agent.Profiles.listActivities(this.profile!.username, predicate);
            runInAction(() => {
                this.userActivities = activities;
                this.loadingUserActivities = false
            });
        } catch (error) {
            console.log(error);
            runInAction(() => this.loadingUserActivities = false);
        }
    }
}