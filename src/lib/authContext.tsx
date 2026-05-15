import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  email: string;
  name: string;
  role: 'admin' | 'standard';
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create user profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Allow the super admin bootstrap
            if (firebaseUser.email === 'olatokeoluwole@gmail.com' || firebaseUser.email === 'wolefalana@hotmail.com') {
              const newProfile: UserProfile = {
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'Admin User',
                role: 'admin',
              };
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
              return;
            }

            // Check if they are pre-registered
            const { query, collection, getDocs, where } = await import('firebase/firestore');
            const preq = query(collection(db, 'pre_registered'), where('email', '==', firebaseUser.email));
            const preSnap = await getDocs(preq);

            if (preSnap.empty) {
               // Not pre-registered, prevent login
               alert("Your email is not registered with the Society. Please contact the administrator.");
               const { signOut, deleteUser } = await import('firebase/auth');
               try {
                 await deleteUser(firebaseUser);
               } catch(e) {
                 await signOut(auth);
               }
               setUser(null);
               setProfile(null);
               return;
            }

            const preData = preSnap.docs[0].data();
            const newProfile: UserProfile = {
              email: firebaseUser.email || '',
              name: preData.name || firebaseUser.displayName || 'New User',
              role: preData.role || 'standard',
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching/creating profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
