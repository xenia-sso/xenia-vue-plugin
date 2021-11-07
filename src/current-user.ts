import { ref, watch } from "vue";
import { api, User } from "./api";

const currentUser = ref<User>();

const onCurrentUserChangeCallbacks: ((user: User | undefined) => void | Promise<void>)[] = [];
const onCurrentUserChange = (cb: (user: User | undefined) => void | Promise<void>) => {
  onCurrentUserChangeCallbacks.push(cb);
};

watch(
  () => currentUser.value,
  () => {
    for (const cb of onCurrentUserChangeCallbacks) {
      void cb(currentUser.value);
    }
  }
);

const isSilentlyLoggingIn = ref(false);
export const silentLogin = async () => {
  isSilentlyLoggingIn.value = true;
  try {
    const data = await api.call<User>("/oauth2/user");
    currentUser.value = data;
  } catch {
  } finally {
    isSilentlyLoggingIn.value = false;
  }
};

export const useCurrentUser = () => ({
  currentUser,
  isSilentlyLoggingIn,
  onCurrentUserChange,
});
