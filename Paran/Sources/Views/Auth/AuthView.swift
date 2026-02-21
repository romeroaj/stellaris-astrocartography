import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var otpCode = ""
    @State private var step: AuthStep = .email
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    enum AuthStep {
        case email, otp
    }

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "globe")
                    .font(.system(size: 48))
                    .foregroundStyle(ParanTheme.accent)

                Text("Sign In to Paran")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(ParanTheme.textPrimary)

                Text("Sync your data across devices")
                    .font(.system(size: 14))
                    .foregroundStyle(ParanTheme.textSecondary)

                if step == .email {
                    emailInput
                } else {
                    otpInput
                }

                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(ParanTheme.difficult)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                Button { dismiss() } label: {
                    Text("Skip for now")
                        .font(.system(size: 14))
                        .foregroundStyle(ParanTheme.textMuted)
                }
                .padding(.bottom, 40)
            }
            .padding(.horizontal, 32)
        }
    }

    private var emailInput: some View {
        VStack(spacing: 16) {
            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .padding()
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))
                .foregroundStyle(ParanTheme.textPrimary)

            Button {
                sendOTP()
            } label: {
                Group {
                    if isLoading {
                        ProgressView().tint(ParanTheme.background)
                    } else {
                        Text("Send Code")
                    }
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(ParanTheme.background)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(email.isEmpty ? ParanTheme.textMuted : ParanTheme.accent, in: RoundedRectangle(cornerRadius: 14))
            }
            .disabled(email.isEmpty || isLoading)
        }
    }

    private var otpInput: some View {
        VStack(spacing: 16) {
            Text("Check your email for a 6-digit code")
                .font(.system(size: 14))
                .foregroundStyle(ParanTheme.textSecondary)

            TextField("123456", text: $otpCode)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.system(size: 24, weight: .bold, design: .monospaced))
                .padding()
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))
                .foregroundStyle(ParanTheme.textPrimary)

            Button {
                verifyOTP()
            } label: {
                Group {
                    if isLoading {
                        ProgressView().tint(ParanTheme.background)
                    } else {
                        Text("Verify")
                    }
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(ParanTheme.background)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(otpCode.count < 6 ? ParanTheme.textMuted : ParanTheme.accent, in: RoundedRectangle(cornerRadius: 14))
            }
            .disabled(otpCode.count < 6 || isLoading)

            Button {
                step = .email
                otpCode = ""
                errorMessage = nil
            } label: {
                Text("Use a different email")
                    .font(.system(size: 13))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
        }
    }

    private func sendOTP() {
        isLoading = true
        errorMessage = nil
        // Supabase OTP will be integrated here
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            step = .otp
        }
    }

    private func verifyOTP() {
        isLoading = true
        errorMessage = nil
        // Supabase OTP verification will be integrated here
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            dismiss()
        }
    }
}
